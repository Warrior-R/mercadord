-- ═══════════════════════════════════════════════════
--  MercadoRD — Hardening adicional de BD (2026-06-19)
--  Idempotente y seguro de re-ejecutar.
--  - Gate is_verified en PUBLICAR (servidor, no solo cliente) → cierra C3.
--  - CHECK de dominio con NOT VALID: solo aplican a escrituras NUEVAS,
--    nunca fallan sobre filas existentes ni bloquean lecturas.
--  - Revoca la función batch de cierre a usuarios (la corre pg_cron/service_role).
--  - FK de winner_id (quedaba sin integridad) e índices de filtro de catálogo.
--  NOTA: NO se reescriben place_bid/buy_now (lógica atómica sensible); el gate
--  de identidad para pujar es "medium" y se deja para una revisión dirigida.
-- ═══════════════════════════════════════════════════

-- ─── C3: exigir identidad verificada para PUBLICAR ───
-- products (el cliente aún no inserta productos; deja la política lista para C1)
drop policy if exists "productos: crear propios" on public.products;
create policy "productos: crear propios" on public.products for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_verified)
  );

-- auctions (el cliente SÍ inserta subastas vía anon key → aquí estaba el hueco real)
drop policy if exists "subastas: crear propias" on public.auctions;
create policy "subastas: crear propias" on public.auctions for insert
  with check (
    auth.uid() = seller_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_verified)
  );

-- ─── Revocar el batch de cierre a usuarios (solo cron/service_role) ───
-- Incluir PUBLIC: las funciones tienen un grant por defecto a PUBLIC que anon/authenticated
-- heredan; revocar solo de anon/authenticated NO basta. pg_cron corre como postgres (lo ejecuta igual).
revoke execute on function public.close_ended_auctions() from public, anon, authenticated;

-- ─── CHECK de dominio (NOT VALID) ───
do $$ begin
  alter table public.profiles add constraint profiles_vstatus_chk
    check (verification_status in ('none','pending','verified','rejected')) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.verifications add constraint verifications_status_chk
    check (status in ('pending','verified','rejected')) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.orders add constraint orders_status_chk
    check (status in ('pendiente','pagado','enviado','entregado','cancelado')) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products add constraint products_rating_chk
    check (rating >= 0 and rating <= 5) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products add constraint products_counts_chk
    check (reviews >= 0 and views >= 0) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.auctions add constraint auctions_status_chk
    check (status in ('active','ended','sold')) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.bids add constraint bids_amount_chk
    check (amount > 0) not valid;
exception when duplicate_object then null; end $$;

-- ─── FK de winner_id (quedaba sin FK → podía quedar huérfano) ───
do $$ begin
  alter table public.auctions
    add constraint auctions_winner_fk foreign key (winner_id)
    references auth.users(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ─── Índices de filtro de catálogo (para cuando products tenga datos reales) ───
create index if not exists products_category_idx on public.products(category);
create index if not exists products_created_idx on public.products(created_at desc);
