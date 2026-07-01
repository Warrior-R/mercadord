import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyNotifications } from "@/lib/notifications";
import { markAllNotificationsRead } from "@/lib/notification-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Notificaciones",
  robots: { index: false },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-DO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NotificacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/entrar?next=/notificaciones&message=${encodeURIComponent("Inicia sesión para ver tus notificaciones.")}`,
    );
  }

  const notifications = await listMyNotifications();
  const hasUnread = notifications.some((n) => n.read === false);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Notificaciones</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-primary hover:text-primary"
            >
              Marcar todas como leídas
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-8 rounded-[10px] border border-dashed border-line bg-card p-10 text-center">
          <p className="text-4xl">🔔</p>
          <p className="mt-3 font-semibold text-ink">No tienes notificaciones</p>
          <p className="mt-1 text-sm text-ink-soft">
            Aquí verás mensajes y reseñas nuevas.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 ${
                n.read === false
                  ? "border-primary/30 bg-primary/5"
                  : "border-line bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-ink">{n.title ?? "Aviso"}</p>
                {n.read === false && (
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                    Nuevo
                  </span>
                )}
              </div>
              {n.body && (
                <p className="mt-1 text-sm text-ink-soft">{n.body}</p>
              )}
              <p className="mt-1 text-xs text-ink-soft">
                {timeAgo(n.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
