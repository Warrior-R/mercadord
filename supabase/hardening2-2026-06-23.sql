-- ════════════════════════════════════════════════════════════════════
--  MercadoRD — Hardening FASE 2 — 2026-06-23
--  Consolida los fixes medios de la auditoría (verificados adversarialmente):
--    SECCIÓN 1 — Subastas: place_bid/buy_now con gate KYC + tope anti-shill.
--    SECCIÓN 2 — products: CHECK de longitud y esquema (NOT VALID).
--    SECCIÓN 3 — webhook_events (idempotencia) + purga de reports >180d.
--  Idempotente: se puede ejecutar más de una vez sin romper nada.
--  Ejecutar completo en: Dashboard → SQL Editor → Run.
--  (Correr DESPUÉS de hardening-2026-06-23.sql; ambos son independientes.)
-- ════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════
--  SECCIÓN 1 — Integridad de subastas (gate KYC + tope anti-shill)
--  CREATE OR REPLACE copiando el cuerpo EXACTO de auctions.sql y añadiendo:
--   (1) Gate KYC: tras AUTH_REQUIRED se exige profiles.is_verified
--       (si no → 'KYC_REQUIRED'). Antes del SELECT ... FOR UPDATE.
--   (2) Tope anti-shill (solo place_bid, tras BID_TOO_LOW):
--       - p_amount >= buy_now_price → 'USE_BUY_NOW' (usa ¡Cómpralo ya!).
--       - p_amount > current_bid*3 + 1000000 → 'BID_TOO_HIGH'.
--  PRESERVADO INTACTO: FOR UPDATE, anti-sniping (2 min), NOT_FOUND,
--  AUCTION_CLOSED, OWN_AUCTION, NO_BUYNOW, BID_TOO_LOW, notificaciones,
--  updates atómicos, grants y json devuelto.
-- ════════════════════════════════════════════════════════════════════

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
  max_allowed numeric;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  -- (1) Gate KYC: exigir identidad verificada antes de tomar el lock.
  if not exists (select 1 from public.profiles p where p.id = uid and p.is_verified) then
    raise exception 'KYC_REQUIRED';
  end if;

  select * into a from public.auctions where id = p_auction for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if a.status <> 'active' or a.ends_at <= now() then raise exception 'AUCTION_CLOSED'; end if;
  if a.seller_id is not null and a.seller_id = uid then raise exception 'OWN_AUCTION'; end if;

  min_next := a.current_bid + public.bid_step(a.current_bid);
  if p_amount < min_next then raise exception 'BID_TOO_LOW:%', min_next; end if;

  -- (2) Tope anti-shill: una puja que alcanza el precio de ¡Cómpralo ya!
  --     debe cerrar la compra por buy_now, no inflar la puja indefinidamente.
  if a.buy_now_price is not null and p_amount >= a.buy_now_price then
    raise exception 'USE_BUY_NOW';
  end if;
  -- Rechazar pujas absurdamente altas (manipulación / dedazo): máx razonable.
  max_allowed := a.current_bid * 3 + 1000000;
  if p_amount > max_allowed then raise exception 'BID_TOO_HIGH:%', max_allowed; end if;

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

create or replace function public.buy_now(p_auction uuid)
returns json language plpgsql security definer set search_path = public as $$
declare a public.auctions; uid uuid := auth.uid(); r record;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  -- (1) Gate KYC: exigir identidad verificada antes de tomar el lock.
  if not exists (select 1 from public.profiles p where p.id = uid and p.is_verified) then
    raise exception 'KYC_REQUIRED';
  end if;

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


-- ════════════════════════════════════════════════════════════════════
--  SECCIÓN 2 — Constraints server-side de products (NOT VALID)
--  Solo aplican a escrituras NUEVAS (INSERT/UPDATE), nunca fallan sobre
--  filas existentes ni bloquean lecturas. char_length() cuenta caracteres.
--
--  ⚠️ AVISO DE EDICIÓN (verificado en js/app.js:1123): al EDITAR un producto
--     el cliente reenvía `sellImgData || ex.img` (el image_url previo). El
--     UPDATE re-evalúa el CHECK sobre el valor NUEVO; si una fila legacy/demo
--     tiene un image_url que NO casa con el esquema permitido, ese UPDATE de
--     edición será RECHAZADO. ANTES de confiar en products_image_url_chk:
--     corre esta query; si devuelve >0 hay filas no conformes — normalízalas
--     o ajusta el cliente para re-subir imagen al editar:
--       select count(*) from public.products where image_url is not null
--         and image_url !~ '^(data:image/(jpeg|png|webp);base64,|https://|/)';
--     El ALTA nueva (app.js:1154) usa solo data:image/jpeg;base64 → conforme.
-- ════════════════════════════════════════════════════════════════════

-- products.title: longitud 1..120 (title es NOT NULL)
do $$ begin
  alter table public.products add constraint products_title_len_chk
    check (char_length(title) between 1 and 120) not valid;
exception when duplicate_object then null; end $$;

-- products.description: <= 2000 (nullable)
do $$ begin
  alter table public.products add constraint products_desc_len_chk
    check (description is null or char_length(description) <= 2000) not valid;
exception when duplicate_object then null; end $$;

-- products.image_url: <= ~3M caracteres base64 (≈2.2 MB de imagen) Y esquema seguro (nullable).
-- Acepta SOLO: data:image/(jpeg|png|webp);base64,...  |  https://...  |  /ruta-relativa
-- Case-sensitive a propósito: bloquea http://, javascript:, file:, data:text/html, etc.
do $$ begin
  alter table public.products add constraint products_image_url_chk
    check (
      image_url is null
      or (
        char_length(image_url) <= 3000000
        and image_url ~ '^(data:image/(jpeg|png|webp);base64,|https://|/)'
      )
    ) not valid;
exception when duplicate_object then null; end $$;


-- ════════════════════════════════════════════════════════════════════
--  SECCIÓN 3 — Idempotencia de webhooks + retención de reports
-- ════════════════════════════════════════════════════════════════════

-- (A) Registro de eventos de webhook ya procesados (anti-replay / dedupe).
--   La Edge Function (service_role) registra el evento DESPUÉS de aplicar el
--   UPDATE con éxito; al recibir una reentrega consulta esta tabla primero.
--   El UNIQUE incluye `status` a propósito: una sesión pasa por varios estados
--   legítimos (In Review → Approved); solo se bloquea la reentrega EXACTA.
create table if not exists public.webhook_events (
  id            uuid primary key default gen_random_uuid(),
  source        text not null,
  session_id    text not null,
  status        text not null,
  processed_at  timestamptz not null default now(),
  unique (source, session_id, status)
);

-- RLS ON sin policies: ningún rol cliente accede; solo service_role (que bypassa RLS).
alter table public.webhook_events enable row level security;
revoke all on public.webhook_events from anon;
revoke all on public.webhook_events from authenticated;
create index if not exists webhook_events_processed_at_idx
  on public.webhook_events (processed_at);

-- (B) Retención de reports: purgar resueltos/descartados > 180 días.
create or replace function public.purge_old_reports()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  delete from public.reports
   where status in ('resuelto','descartado')
     and created_at < now() - interval '180 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_old_reports() from public;
revoke all on function public.purge_old_reports() from anon;
revoke all on function public.purge_old_reports() from authenticated;

-- Programación con pg_cron (best-effort: si no existe, no falla; blindado al
-- estilo de auctions.sql para que un fallo de cron.schedule no aborte el archivo).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      if exists (select 1 from cron.job where jobname = 'purge_old_reports') then
        perform cron.unschedule('purge_old_reports');
      end if;
      perform cron.schedule('purge_old_reports', '0 4 * * *',
        $job$ select public.purge_old_reports(); $job$);
      raise notice 'pg_cron: job purge_old_reports programado (04:00 UTC diario).';
    exception when others then
      raise notice 'pg_cron presente pero no se pudo programar (%): la función quedó creada; programa la purga a mano.', sqlerrm;
    end;
  else
    raise notice 'pg_cron NO disponible: purge_old_reports() creada pero NO programada. Habilita pg_cron y re-ejecuta este archivo.';
  end if;
end;
$$;
