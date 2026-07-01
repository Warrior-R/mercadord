import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth-actions";
import { countUnreadNotifications } from "@/lib/notifications";

export async function UserMenu() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/entrar"
          className="rounded-md border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent2"
        >
          Entrar
        </Link>
        <Link
          href="/registro"
          className="hidden rounded-md bg-accent2 px-3 py-1.5 text-xs font-semibold text-ink transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white sm:inline-block"
        >
          Crear cuenta
        </Link>
      </div>
    );
  }

  const name =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "Mi cuenta";

  const unread = await countUnreadNotifications();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href="/favoritos"
        aria-label="Favoritos"
        className="hidden text-lg text-white/90 hover:text-white sm:inline"
      >
        🤍
      </Link>
      <Link
        href="/notificaciones"
        aria-label={
          unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones"
        }
        className="relative text-lg text-white/90 hover:text-white"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
      <Link
        href="/mensajes"
        aria-label="Mensajes"
        className="text-lg text-white/90 hover:text-white"
      >
        💬
      </Link>
      <Link
        href="/cuenta"
        className="hidden max-w-[140px] truncate text-sm text-white/90 hover:text-white sm:inline"
      >
        {name}
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent2"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
