-- ═══════════════════════════════════════════════════════════════════════
-- FASE 2 (clasificados) — Moderación
--   La tabla public.reports ya existe (chatbot-2026-06-22.sql) con RLS:
--   insert por autenticado, lectura/edición solo admin. Aquí añadimos lo que
--   falta para moderar anuncios: que un ADMIN pueda retirar un producto ajeno.
-- Correr en Supabase → SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- Permite a un admin (profiles.is_admin) eliminar cualquier producto reportado.
-- No sustituye la policy "eliminar propios": ambas coexisten (OR de policies).
drop policy if exists "productos: admin elimina" on public.products;
create policy "productos: admin elimina" on public.products for delete
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin is true));

-- Y ocultar/editar un anuncio reportado (por si en el futuro se marca en vez de borrar).
drop policy if exists "productos: admin edita" on public.products;
create policy "productos: admin edita" on public.products for update
  to authenticated
  using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin is true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin is true));
