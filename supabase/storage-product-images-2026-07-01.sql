-- ════════════════════════════════════════════════════════════════════
--  MercadoRD — Storage para fotos de productos (2026-07-01)
--  Migra las fotos de base64-en-la-fila a Supabase Storage. El frontend
--  (uploadProductImage en app.js) sube el JPEG comprimido a este bucket y
--  guarda solo la URL pública en products.image_url.
--  Cada usuario solo puede escribir en su propia carpeta (uid/archivo.jpg).
-- ════════════════════════════════════════════════════════════════════

-- Bucket público (lectura), 5 MB máx, solo imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Lectura pública de los objetos del bucket.
drop policy if exists "product-images public read" on storage.objects;
create policy "product-images public read" on storage.objects
  for select using (bucket_id = 'product-images');

-- Subir: solo usuarios autenticados y únicamente dentro de su carpeta (uid/...).
drop policy if exists "product-images user insert" on storage.objects;
create policy "product-images user insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Actualizar/sobrescribir: solo el dueño de la carpeta.
drop policy if exists "product-images user update" on storage.objects;
create policy "product-images user update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Borrar: solo el dueño de la carpeta.
drop policy if exists "product-images user delete" on storage.objects;
create policy "product-images user delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
