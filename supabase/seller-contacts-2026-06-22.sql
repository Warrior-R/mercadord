-- ════════════════════════════════════════════════════════════════════
--  Contacto del vendedor por WhatsApp — 2026-06-22
--  Requisitos del usuario:
--   1) El anuncio usa el número que el VENDEDOR puso al publicar (no uno fijo).
--   2) SOLO usuarios verificados (KYC) pueden obtener ese número y contactar.
--
--  El número se guarda en una tabla aparte con RLS (no en products/auctions),
--  para no exponerlo en el feed público ni romper los select('*') existentes.
--  La política de lectura exige profiles.is_verified → el filtro es real a
--  nivel de BD: un anónimo o no verificado NUNCA recibe el número.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.seller_contacts (
  ref_id     uuid not null,                         -- id del producto o subasta
  kind       text not null check (kind in ('product','auction')),
  wa         text not null,                         -- WhatsApp (solo dígitos, con país)
  owner      uuid not null default auth.uid(),      -- vendedor dueño del contacto
  updated_at timestamptz not null default now(),
  primary key (ref_id, kind)
);

alter table public.seller_contacts enable row level security;

-- LECTURA: solo usuarios autenticados Y verificados (KYC aprobado).
drop policy if exists sc_select_verified on public.seller_contacts;
create policy sc_select_verified on public.seller_contacts
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_verified is true
  ));

-- ESCRITURA: el vendedor gestiona SOLO sus propios contactos.
drop policy if exists sc_insert_own on public.seller_contacts;
create policy sc_insert_own on public.seller_contacts
  for insert to authenticated
  with check (owner = auth.uid());

drop policy if exists sc_update_own on public.seller_contacts;
create policy sc_update_own on public.seller_contacts
  for update to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

drop policy if exists sc_delete_own on public.seller_contacts;
create policy sc_delete_own on public.seller_contacts
  for delete to authenticated
  using (owner = auth.uid());

-- Sin acceso para anónimos; los autenticados pasan por RLS.
revoke all on public.seller_contacts from anon, public;
grant select, insert, update, delete on public.seller_contacts to authenticated;
