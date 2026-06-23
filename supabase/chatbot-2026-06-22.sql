-- ════════════════════════════════════════════════════════════════════
--  MercadoRD — Chatbot IA + Reportes — 2026-06-22
--  Tabla donde el asistente (Edge Function `chatbot`) guarda los reportes
--  de perfiles sospechosos, fraudes o spam que reportan los usuarios.
--
--  · Inserción: la Edge Function usa service_role y bypassa RLS. Igual se
--    permite a un usuario autenticado crear su propio reporte directamente.
--  · Lectura / gestión: SOLO admin (profiles.is_admin), igual que publicidad.
--  Idempotente: se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid references auth.users(id) on delete set null,  -- null = anónimo
  reporter_email  text,                       -- denormalizado para contacto/contexto
  target          text not null,              -- a quién/qué se reporta (perfil, enlace, anuncio)
  report_type     text not null default 'otro'
                    check (report_type in ('fraude','spam','sospechoso','otro')),
  description     text not null,              -- qué ocurrió
  context         text,                       -- fragmento de la conversación (opcional)
  status          text not null default 'pendiente'
                    check (status in ('pendiente','revisando','resuelto','descartado')),
  admin_notes     text,
  source          text default 'chatbot',
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

alter table public.reports enable row level security;

-- Inserción: un usuario autenticado puede crear su propio reporte (o anónimo
-- con reporter_id null). El camino normal es la Edge Function (service_role).
drop policy if exists rep_insert on public.reports;
create policy rep_insert on public.reports
  for insert to authenticated
  with check (reporter_id is null or reporter_id = auth.uid());

-- Lectura: solo admin ve los reportes.
drop policy if exists rep_admin_read on public.reports;
create policy rep_admin_read on public.reports
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin is true));

-- Gestión (cambiar estado / notas): solo admin.
drop policy if exists rep_admin_update on public.reports;
create policy rep_admin_update on public.reports
  for update to authenticated
  using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin is true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin is true));

grant insert on public.reports to authenticated;
grant select, update on public.reports to authenticated;  -- RLS limita lectura/edición a admin

create index if not exists reports_status_idx   on public.reports(status, created_at desc);
create index if not exists reports_reporter_idx on public.reports(reporter_id);
