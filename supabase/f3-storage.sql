-- ═══════════════════════════════════════════════════════════════════════
-- FASE 3 — Storage para imágenes de productos
--   Bucket público 'product-images'. Cada usuario sube SOLO dentro de su
--   carpeta (prefijo = su uid), la lectura es pública. Reemplaza el hack de
--   "pegar una URL". Correr en Supabase → SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Lectura pública de los objetos del bucket.
drop policy if exists "prod-img: leer público" on storage.objects;
create policy "prod-img: leer público" on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

-- Subir: autenticado y SOLO en su propia carpeta (primer segmento = uid).
drop policy if exists "prod-img: subir propio" on storage.objects;
create policy "prod-img: subir propio" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Actualizar/borrar: solo los objetos de su carpeta.
drop policy if exists "prod-img: editar propio" on storage.objects;
create policy "prod-img: editar propio" on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "prod-img: borrar propio" on storage.objects;
create policy "prod-img: borrar propio" on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
