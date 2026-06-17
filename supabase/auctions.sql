-- ═══════════════════════════════════════════════════
--  MercadoRD — Subastas en tiempo real (multi-usuario)
--  Tablas auctions / bids / notifications + RPC + cron + realtime
--  Idempotente: se puede ejecutar más de una vez sin romper nada.
--  Ejecutar en: Dashboard → SQL Editor → Run  (o vía Management API).
-- ═══════════════════════════════════════════════════

-- ─── SUBASTAS ───────────────────────────────────────
create table if not exists public.auctions (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid references auth.users(id) on delete set null,
  seller_name   text,
  title         text not null,
  icon          text default '📦',
  image_url     text,
  location      text,
  start_price   numeric(12,2) not null,
  current_bid   numeric(12,2) not null,
  bid_count     integer default 0,
  high_bidder   uuid references auth.users(id) on delete set null,
  buy_now_price numeric(12,2),
  min_increment numeric(12,2) default 100,
  ends_at       timestamptz not null,
  status        text default 'active',   -- active | ended | sold
  winner_id     uuid,
  created_at    timestamptz default now()
);
alter table public.auctions enable row level security;

drop policy if exists "subastas: ver todas"                       on public.auctions;
drop policy if exists "subastas: ver activas o de participantes"  on public.auctions;
drop policy if exists "subastas: crear propias"                   on public.auctions;
-- Las subastas ACTIVAS son públicas (cualquiera las ve en el listado/búsqueda).
-- Las FINALIZADAS (ended/sold, o ya vencidas) dejan de ser públicas: solo las
-- puede ver el vendedor, el ganador y quienes pujaron. Así siguen accesibles por
-- enlace directo (#subasta=ID) para los participantes, pero NO por el listado.
create policy "subastas: ver activas o de participantes" on public.auctions for select using (
  (status = 'active' and ends_at > now())
  or auth.uid() = seller_id
  or auth.uid() = high_bidder
  or auth.uid() = winner_id
  or exists (select 1 from public.bids b where b.auction_id = auctions.id and b.bidder_id = auth.uid())
);
create policy "subastas: crear propias" on public.auctions for insert with check (auth.uid() = seller_id);
-- Sin policy de UPDATE/DELETE a propósito: el cliente NO puede tocar current_bid
-- ni status. Solo las funciones SECURITY DEFINER (place_bid / buy_now / close_*).

-- Nombre ENMASCARADO del postor que va ganando (seguro de exponer en público).
alter table public.auctions add column if not exists leader_masked text;

-- ─── PUJAS ──────────────────────────────────────────
create table if not exists public.bids (
  id          uuid primary key default gen_random_uuid(),
  auction_id  uuid references public.auctions(id) on delete cascade,
  bidder_id   uuid references auth.users(id) on delete cascade,
  bidder_name text,
  amount      numeric(12,2) not null,
  created_at  timestamptz default now()
);
alter table public.bids enable row level security;
create index if not exists bids_auction_idx on public.bids(auction_id, created_at desc);

drop policy if exists "pujas: leer propias" on public.bids;
create policy "pujas: leer propias" on public.bids for select using (auth.uid() = bidder_id);
-- Nadie inserta pujas directamente: solo place_bid() (SECURITY DEFINER).
-- La lista pública de pujadores se sirve ENMASCARADA vía get_auction_bids().

-- ─── NOTIFICACIONES ─────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  type        text,            -- outbid | won | lost | bid | buynow
  auction_id  uuid,
  title       text,
  body        text,
  read        boolean default false,
  created_at  timestamptz default now()
);
alter table public.notifications enable row level security;
create index if not exists notif_user_idx on public.notifications(user_id, created_at desc);

drop policy if exists "notif: leer propias"   on public.notifications;
drop policy if exists "notif: marcar propias" on public.notifications;
create policy "notif: leer propias"   on public.notifications for select using (auth.uid() = user_id);
create policy "notif: marcar propias" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Insert solo desde funciones SECURITY DEFINER.

-- ─── Enmascarar nombre (privacidad de pujadores) ────
-- "Juan Pérez" -> "Jua***" · "Jo" -> "J***" · vacío -> "Usuario"
create or replace function public.mask_name(p text)
returns text language plpgsql immutable as $$
declare f text;
begin
  if p is null or length(trim(p)) = 0 then return 'Usuario'; end if;
  f := split_part(trim(p), ' ', 1);
  if length(f) <= 2 then return left(f,1) || '***'; end if;
  return left(f,3) || '***';
end; $$;

-- ─── Incremento mínimo de puja ──────────────────────
-- DEBE coincidir con bidStep() de js/app.js: 2% redondeado a centenas, mín RD$500.
create or replace function public.bid_step(p numeric)
returns numeric language sql immutable as $$
  select greatest(500, round(p * 0.02 / 100) * 100);
$$;

-- ─── Pujar (atómico, server-side) ───────────────────
create or replace function public.place_bid(p_auction uuid, p_amount numeric)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  a public.auctions;
  uid uuid := auth.uid();
  uname text;
  prev uuid;
  min_next numeric;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into a from public.auctions where id = p_auction for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if a.status <> 'active' or a.ends_at <= now() then raise exception 'AUCTION_CLOSED'; end if;
  if a.seller_id is not null and a.seller_id = uid then raise exception 'OWN_AUCTION'; end if;

  min_next := a.current_bid + public.bid_step(a.current_bid);
  if p_amount < min_next then raise exception 'BID_TOO_LOW:%', min_next; end if;

  select coalesce(full_name, split_part(email,'@',1)) into uname from public.profiles where id = uid;
  prev := a.high_bidder;

  insert into public.bids(auction_id, bidder_id, bidder_name, amount)
    values (p_auction, uid, coalesce(uname,'Usuario'), p_amount);

  update public.auctions set
    current_bid   = p_amount,
    bid_count     = bid_count + 1,
    high_bidder   = uid,
    leader_masked = public.mask_name(uname),
    -- Anti-sniping estilo eBay: pujar en los últimos 2 min extiende el cierre
    ends_at       = case when ends_at - now() < interval '2 minutes'
                         then now() + interval '2 minutes' else ends_at end
  where id = p_auction
  returning * into a;

  -- Avisar al postor que acaba de ser superado
  if prev is not null and prev <> uid then
    insert into public.notifications(user_id, type, auction_id, title, body)
    values (prev, 'outbid', p_auction, '⚠️ Te superaron en una subasta',
            'Alguien pujó RD$' || to_char(a.current_bid,'FM999,999,990') ||
            ' por "' || a.title || '". ¡Puja de nuevo para recuperar el liderato!');
  end if;

  return json_build_object('ok', true, 'current_bid', a.current_bid,
    'bid_count', a.bid_count, 'ends_at', a.ends_at, 'high_bidder', a.high_bidder);
end; $$;
grant execute on function public.place_bid(uuid, numeric) to authenticated;

-- ─── ¡Cómpralo ya! (cierra la subasta para el comprador) ─
create or replace function public.buy_now(p_auction uuid)
returns json language plpgsql security definer set search_path = public as $$
declare a public.auctions; uid uuid := auth.uid(); r record;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into a from public.auctions where id = p_auction for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if a.status <> 'active' or a.ends_at <= now() then raise exception 'AUCTION_CLOSED'; end if;
  if a.buy_now_price is null then raise exception 'NO_BUYNOW'; end if;

  update public.auctions set status='sold', winner_id=uid, ends_at=now() where id=p_auction;

  for r in select distinct bidder_id from public.bids
           where auction_id=p_auction and bidder_id is not null and bidder_id<>uid loop
    insert into public.notifications(user_id,type,auction_id,title,body)
    values (r.bidder_id,'lost',p_auction,'Subasta cerrada',
            '"'||a.title||'" se vendió con ¡Cómpralo ya! Otra persona se lo llevó.');
  end loop;

  return json_build_object('ok',true,'price',a.buy_now_price,'title',a.title,'icon',a.icon);
end; $$;
grant execute on function public.buy_now(uuid) to authenticated;

-- ─── Lista pública de pujadores (nombres enmascarados) ─
create or replace function public.get_auction_bids(p_auction uuid, p_limit int default 12)
returns table(masked text, amount numeric, created_at timestamptz)
language sql security definer set search_path = public as $$
  select public.mask_name(bidder_name), amount, created_at
  from public.bids where auction_id = p_auction
  order by created_at desc limit p_limit;
$$;
grant execute on function public.get_auction_bids(uuid, int) to anon, authenticated;

-- ─── Cerrar subastas vencidas + notificar ganador/perdedores ─
create or replace function public.close_ended_auctions()
returns int language plpgsql security definer set search_path = public as $$
declare a public.auctions; r record; n int := 0;
begin
  for a in select * from public.auctions
           where status='active' and ends_at <= now() for update skip locked loop
    update public.auctions set status='ended', winner_id=a.high_bidder where id=a.id;
    n := n + 1;

    if a.high_bidder is not null then
      insert into public.notifications(user_id,type,auction_id,title,body)
      values (a.high_bidder,'won',a.id,'🏆 ¡Ganaste la subasta!',
        'Ganaste "'||a.title||'" con RD$'||to_char(a.current_bid,'FM999,999,990')||
        '. Completa el pago para coordinar la entrega.');
    end if;

    for r in select distinct bidder_id from public.bids
             where auction_id=a.id and bidder_id is not null
               and (a.high_bidder is null or bidder_id <> a.high_bidder) loop
      insert into public.notifications(user_id,type,auction_id,title,body)
      values (r.bidder_id,'lost',a.id,'Subasta finalizada',
        'No ganaste "'||a.title||'". Cerró en RD$'||to_char(a.current_bid,'FM999,999,990')||
        '. ¡Sigue otras subastas activas!');
    end loop;
  end loop;
  return n;
end; $$;
grant execute on function public.close_ended_auctions() to anon, authenticated;

-- ─── pg_cron: cerrar subastas cada minuto (best-effort) ─
do $$ begin
  begin execute 'create extension if not exists pg_cron'; exception when others then null; end;
  begin
    if exists (select 1 from cron.job where jobname='mrd-close-auctions') then
      perform cron.unschedule('mrd-close-auctions');
    end if;
    perform cron.schedule('mrd-close-auctions','* * * * *','select public.close_ended_auctions();');
  exception when others then null; end;
end $$;

-- ─── Realtime: publicar cambios de auctions y notifications ─
do $$ begin
  begin alter publication supabase_realtime add table public.auctions;      exception when others then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when others then null; end;
end $$;

-- ─── Datos semilla (solo si la tabla está vacía) ────
insert into public.auctions
  (title, icon, location, seller_name, start_price, current_bid, bid_count, buy_now_price, min_increment, ends_at)
select * from (values
  ('Toyota Hilux 2020 4x4 Diesel',      '🛻', 'SD',  'AutosRD',  600000, 650000, 18, 850000, 5000, now()+interval '154 minutes'),
  ('MacBook Air M2 256GB',              '💻', 'STI', 'TechShop',  50000,  58000, 31,  78000, 1000, now()+interval '312 minutes'),
  ('Generador Eléctrico 8KW',           '⚡', 'SD',  'GeneraRD',  30000,  35000,  9,  52000, 1000, now()+interval '26 hours'),
  ('Colección Relojes Vintage Suizos',  '⌚', 'SD',  'LujoRD',    18000,  22000, 14,  36000,  500, now()+interval '230 minutes'),
  ('iPhone 15 Pro Max 1TB',             '📱', 'STI', 'AppleRD',   70000,  85000, 42, 108000, 2500, now()+interval '45 minutes')
) v(title,icon,location,seller_name,start_price,current_bid,bid_count,buy_now_price,min_increment,ends_at)
-- Re-siembra subastas activas cuando NO hay ninguna activa (p. ej. todas vencieron):
-- así el listado público nunca queda vacío al ejecutar este script.
where not exists (select 1 from public.auctions where status='active' and ends_at > now());

-- Pujas históricas de relleno para que el feed enmascarado no salga vacío
insert into public.bids(auction_id, bidder_id, bidder_name, amount, created_at)
select a.id, null, x.nm, a.current_bid - a.min_increment * x.g, now() - (x.g * interval '7 minutes')
from public.auctions a
join (values (1,'Carlos Méndez'),(2,'María Gómez'),(3,'José Peña')) x(g,nm) on true
where a.status='active'
  and not exists (select 1 from public.bids b where b.auction_id = a.id);

-- Backfill del líder enmascarado para las subastas semilla (último postor)
update public.auctions a set leader_masked = public.mask_name(
  (select b.bidder_name from public.bids b where b.auction_id = a.id order by b.created_at desc limit 1))
where a.leader_masked is null
  and exists (select 1 from public.bids b where b.auction_id = a.id);
