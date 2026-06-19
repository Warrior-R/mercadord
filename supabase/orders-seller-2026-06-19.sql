-- ═══════════════════════════════════════════════════
--  MercadoRD — Pedidos lado-vendedor (2026-06-19)
--  - order_items: una fila por línea de pedido, con seller_id → el vendedor
--    "recibe" sus ventas (RLS por seller_id).
--  - create_order(): RPC SECURITY DEFINER que RECALCULA precios y totales en el
--    servidor a partir de la tabla products (anti-manipulación del cliente),
--    crea el pedido + sus order_items y notifica a cada vendedor.
--  - get_my_sales(): el vendedor lista sus ventas (con datos de entrega del
--    comprador, NUNCA la tarjeta).
--  - set_order_item_status(): el vendedor marca enviado/entregado/cancelado;
--    se notifica al comprador y se recalcula el estado agregado del pedido.
--  Idempotente: seguro de re-ejecutar.
-- ═══════════════════════════════════════════════════

-- ─── LÍNEAS DE PEDIDO (una por producto, con vendedor) ───
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references public.orders(id)   on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  seller_id   uuid references auth.users(id)      on delete set null,
  seller_name text,
  title       text,
  qty         integer not null check (qty > 0),
  price       numeric(12,2) not null check (price >= 0),
  line_total  numeric(12,2),
  status      text default 'pendiente',  -- pendiente | enviado | entregado | cancelado
  created_at  timestamptz default now()
);

alter table public.order_items enable row level security;

drop policy if exists "items: vendedor ve los suyos" on public.order_items;
drop policy if exists "items: comprador ve los suyos" on public.order_items;
-- El vendedor ve las líneas que le corresponden (sus ventas).
create policy "items: vendedor ve los suyos" on public.order_items for select
  using (auth.uid() = seller_id);
-- El comprador ve las líneas de SUS pedidos.
create policy "items: comprador ve los suyos" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.buyer_id = auth.uid()));
-- Sin policy de INSERT/UPDATE/DELETE: solo las funciones SECURITY DEFINER
-- (create_order / set_order_item_status) tocan esta tabla.

create index if not exists order_items_seller_idx on public.order_items(seller_id, created_at desc);
create index if not exists order_items_order_idx  on public.order_items(order_id);

do $$ begin
  alter table public.order_items add constraint order_items_status_chk
    check (status in ('pendiente','enviado','entregado','cancelado')) not valid;
exception when duplicate_object then null; end $$;

-- ─── CREAR PEDIDO (server-side, anti-manipulación) ───
-- p_items: jsonb array de { sb: <product uuid|null>, t: título, q: cantidad, p: precio cliente }
--   · Si 'sb' apunta a un producto real → se ignora el precio del cliente y se
--     usa el de la tabla products (y se enlaza seller_id/product_id).
--   · Si no (demo/subasta/oferta) → se confía el precio del cliente, sin vendedor.
-- p_buyer: jsonb { name, phone, addr, prov }   ·   p_payment: 'card' | 'cash'
-- Envío fijo RD$350 e ITBIS 18% se calculan en el servidor (no los manda el cliente).
create or replace function public.create_order(p_items jsonb, p_buyer jsonb, p_payment text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  el        jsonb;
  v_sb      text;
  v_pid     uuid;
  v_seller  uuid;
  v_sname   text;
  v_title   text;
  v_qty     int;
  v_price   numeric(12,2);
  v_sub     numeric(12,2) := 0;
  v_ship    numeric(12,2) := 350;
  v_itbis   numeric(12,2);
  v_total   numeric(12,2);
  v_status  text;
  v_code    text;
  v_oid     uuid;
  canon     jsonb := '[]'::jsonb;
  lines     jsonb := '[]'::jsonb;   -- líneas resueltas para insertar luego
  pr        record;
  sel       record;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  for el in select * from jsonb_array_elements(p_items) loop
    v_sb    := nullif(el->>'sb','');
    v_qty   := greatest(1, least(99, coalesce((el->>'q')::int, 1)));
    v_title := coalesce(el->>'t','Producto');
    v_price := coalesce((el->>'p')::numeric, 0);
    v_pid   := null; v_seller := null; v_sname := null;

    -- ¿Es un producto real de la BD? Entonces el servidor manda en precio y vendedor.
    if v_sb is not null and v_sb ~ '^[0-9a-fA-F-]{36}$' then
      begin
        select id, user_id, seller_name, title, price
          into pr from public.products where id = v_sb::uuid;
        if found then
          v_pid    := pr.id;
          v_seller := pr.user_id;
          v_sname  := pr.seller_name;
          v_title  := pr.title;          -- título de confianza (no el del cliente)
          v_price  := pr.price;          -- PRECIO DE CONFIANZA (anti-manipulación)
        end if;
      exception when others then
        v_pid := null; v_seller := null;   -- uuid raro → tratar como no-BD
      end;
    end if;

    if v_price < 0 then v_price := 0; end if;
    v_sub := v_sub + v_price * v_qty;

    canon := canon || jsonb_build_object('title', v_title, 'qty', v_qty, 'price', v_price);
    lines := lines || jsonb_build_object(
      'pid', v_pid, 'seller', v_seller, 'sname', v_sname,
      'title', v_title, 'qty', v_qty, 'price', v_price);
  end loop;

  v_itbis  := round(v_sub * 0.18);
  v_total  := v_sub + v_ship + v_itbis;
  v_status := case when p_payment = 'card' then 'pagado' else 'pendiente' end;
  v_code   := 'MRD-' || upper(substr(md5(gen_random_uuid()::text), 1, 7));

  insert into public.orders (code, buyer_id, items, subtotal, shipping, itbis, total, buyer_info, payment, status)
  values (v_code, uid, canon, v_sub, v_ship, v_itbis, v_total, p_buyer,
          coalesce(p_payment,'card'), v_status)
  returning id into v_oid;

  -- Insertar las líneas resueltas
  for el in select * from jsonb_array_elements(lines) loop
    insert into public.order_items (order_id, product_id, seller_id, seller_name, title, qty, price, line_total)
    values (v_oid,
            nullif(el->>'pid','')::uuid,
            nullif(el->>'seller','')::uuid,
            el->>'sname', el->>'title',
            (el->>'qty')::int, (el->>'price')::numeric,
            (el->>'qty')::int * (el->>'price')::numeric);
  end loop;

  -- Notificar a cada vendedor real (uno por vendedor distinto, excepto si se compra a sí mismo)
  for sel in
    select seller_id, sum(line_total) tot, count(*) n
    from public.order_items
    where order_id = v_oid and seller_id is not null and seller_id <> uid
    group by seller_id
  loop
    insert into public.notifications (user_id, type, title, body)
    values (sel.seller_id, 'sale', '🎉 ¡Vendiste un producto!',
            'Tienes ' || sel.n || ' artículo(s) vendido(s) por RD$' ||
            to_char(sel.tot, 'FM999,999,990') || ' en el pedido ' || v_code ||
            '. Coordina el envío desde "Mis ventas".');
  end loop;

  return json_build_object('ok', true, 'code', v_code, 'subtotal', v_sub,
    'shipping', v_ship, 'itbis', v_itbis, 'total', v_total, 'status', v_status);
end; $$;
revoke execute on function public.create_order(jsonb, jsonb, text) from public, anon;
grant execute on function public.create_order(jsonb, jsonb, text) to authenticated;

-- ─── VENTAS DEL VENDEDOR ───
-- Devuelve las líneas que vende el usuario actual, con los datos de entrega del
-- comprador (nombre/teléfono/provincia) para coordinar — NUNCA la tarjeta.
create or replace function public.get_my_sales()
returns table(
  item_id uuid, order_code text, title text, qty int, price numeric,
  line_total numeric, status text, created_at timestamptz,
  buyer_name text, buyer_phone text, buyer_prov text, payment text)
language sql security definer set search_path = public as $$
  select oi.id, o.code, oi.title, oi.qty, oi.price, oi.line_total, oi.status, oi.created_at,
         o.buyer_info->>'name', o.buyer_info->>'phone', o.buyer_info->>'prov', o.payment
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.seller_id = auth.uid()
  order by oi.created_at desc;
$$;
revoke execute on function public.get_my_sales() from public, anon;
grant execute on function public.get_my_sales() to authenticated;

-- ─── CAMBIAR ESTADO DE UNA LÍNEA (vendedor) ───
-- El vendedor avanza el estado de su línea; se notifica al comprador y se
-- recalcula el estado agregado del pedido (para que "Mis compras" lo refleje).
create or replace function public.set_order_item_status(p_item uuid, p_status text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  it  public.order_items;
  v_buyer uuid;
  v_code  text;
  v_oid   uuid;
  agg     text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_status not in ('enviado','entregado','cancelado') then raise exception 'BAD_STATUS'; end if;

  update public.order_items set status = p_status
   where id = p_item and seller_id = uid
   returning * into it;
  if not found then raise exception 'NOT_FOUND'; end if;
  v_oid := it.order_id;

  select buyer_id, code into v_buyer, v_code from public.orders where id = v_oid;

  -- Recalcular estado agregado del pedido (ignora cancelados)
  if not exists (select 1 from public.order_items where order_id = v_oid and status not in ('entregado','cancelado'))
     and exists (select 1 from public.order_items where order_id = v_oid and status = 'entregado') then
    agg := 'entregado';
  elsif exists (select 1 from public.order_items where order_id = v_oid and status in ('enviado','entregado')) then
    agg := 'enviado';
  else
    agg := null;
  end if;
  if agg is not null then
    update public.orders set status = agg where id = v_oid;
  end if;

  -- Notificar al comprador
  if v_buyer is not null and v_buyer <> uid then
    insert into public.notifications (user_id, type, title, body)
    values (v_buyer, 'order',
      case p_status
        when 'enviado'   then '🚚 Tu pedido va en camino'
        when 'entregado' then '✅ Pedido entregado'
        else '⚠️ Línea de pedido cancelada' end,
      '"' || left(it.title, 40) || '" — pedido ' || v_code || ' ahora está: ' || p_status || '.');
  end if;

  return json_build_object('ok', true, 'status', p_status, 'order_status', agg);
end; $$;
revoke execute on function public.set_order_item_status(uuid, text) from public, anon;
grant execute on function public.set_order_item_status(uuid, text) to authenticated;
