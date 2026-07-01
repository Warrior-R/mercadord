-- ═══════════════════════════════════════════════════════════════════════
-- FASE 2 (clasificados) — Reseñas y reputación del VENDEDOR
--   En un marketplace de clasificados no hay compra en línea, así que la
--   reputación es del vendedor (usuario), no del producto. Una reseña por
--   par (reseñador → vendedor). Elimina el sistema falso (C4 del audit).
-- Correr en Supabase → SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.seller_reviews (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text check (char_length(btrim(comment)) between 0 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Una sola reseña por reseñador y vendedor (se puede editar, no duplicar).
  unique (seller_id, reviewer_id)
);

create index if not exists seller_reviews_seller_idx on public.seller_reviews(seller_id, created_at desc);

alter table public.seller_reviews enable row level security;

-- Leer: público (la reputación es visible en el anuncio).
drop policy if exists "rev: leer" on public.seller_reviews;
create policy "rev: leer" on public.seller_reviews for select
  to anon, authenticated using (true);

-- Crear: autenticado, como uno mismo, y NUNCA reseñarse a sí mismo.
drop policy if exists "rev: crear" on public.seller_reviews;
create policy "rev: crear" on public.seller_reviews for insert
  to authenticated
  with check (auth.uid() = reviewer_id and reviewer_id <> seller_id);

-- Editar/borrar: solo la propia reseña.
drop policy if exists "rev: editar propia" on public.seller_reviews;
create policy "rev: editar propia" on public.seller_reviews for update
  to authenticated using (auth.uid() = reviewer_id) with check (auth.uid() = reviewer_id);

drop policy if exists "rev: borrar propia" on public.seller_reviews;
create policy "rev: borrar propia" on public.seller_reviews for delete
  to authenticated using (auth.uid() = reviewer_id);

grant select on public.seller_reviews to anon, authenticated;
grant insert, update, delete on public.seller_reviews to authenticated;  -- RLS lo limita a lo propio

-- Reputación agregada por vendedor (promedio + conteo). Vista de solo lectura.
create or replace view public.seller_reputation
with (security_invoker = true) as
  select seller_id,
         round(avg(rating)::numeric, 2) as avg_rating,
         count(*)::int                  as review_count
  from public.seller_reviews
  group by seller_id;

grant select on public.seller_reputation to anon, authenticated;

-- Notificar al vendedor cuando recibe una reseña (reusa notifications).
create or replace function public.notify_new_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body)
  values (new.seller_id, 'review', '⭐ Nueva reseña',
          'Recibiste una reseña de ' || new.rating || ' estrellas. Míralas en tu perfil.');
  return new;
end; $$;

drop trigger if exists trg_notify_new_review on public.seller_reviews;
create trigger trg_notify_new_review after insert on public.seller_reviews
  for each row execute function public.notify_new_review();
