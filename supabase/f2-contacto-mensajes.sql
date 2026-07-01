-- ═══════════════════════════════════════════════════════════════════════
-- FASE 2 (clasificados) — Contacto al vendedor + mensajería in-app
-- Correr en Supabase → SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- 1) WhatsApp/teléfono opcional en el anuncio (opt-in del vendedor).
alter table public.products add column if not exists whatsapp text;

-- 2) Mensajes comprador ⇄ vendedor.
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid references public.products(id) on delete set null,
  product_title text,
  sender_id     uuid not null references auth.users(id) on delete cascade,
  recipient_id  uuid not null references auth.users(id) on delete cascade,
  body          text not null check (char_length(btrim(body)) between 1 and 2000),
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists messages_recipient_idx on public.messages(recipient_id, created_at desc);
create index if not exists messages_sender_idx    on public.messages(sender_id, created_at desc);

alter table public.messages enable row level security;

-- Leer: solo remitente o destinatario.
drop policy if exists "msg: leer propios" on public.messages;
create policy "msg: leer propios" on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Enviar: solo como uno mismo, y no a uno mismo.
drop policy if exists "msg: enviar" on public.messages;
create policy "msg: enviar" on public.messages for insert
  with check (auth.uid() = sender_id and sender_id <> recipient_id);

-- Marcar leído: solo el destinatario sobre sus mensajes recibidos.
drop policy if exists "msg: marcar leido" on public.messages;
create policy "msg: marcar leido" on public.messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- Notificar al vendedor cuando recibe un mensaje (reusa la tabla notifications).
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body)
  values (new.recipient_id, 'message', '💬 Nuevo mensaje',
          'Tienes un mensaje sobre ' || coalesce(new.product_title, 'un anuncio') ||
          '. Míralo en "Mensajes".');
  return new;
end; $$;

drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message after insert on public.messages
  for each row execute function public.notify_new_message();
