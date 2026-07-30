import { createClient } from "@/lib/supabase/server";

export type Notification = {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  read: boolean | null;
  created_at: string | null;
};

/** Notificaciones del usuario actual (RLS: solo las propias). Tolerante a tabla ausente. */
export async function listMyNotifications(limit = 50): Promise<Notification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id,type,title,body,read,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as Notification[];
  } catch {
    return [];
  }
}

/** Nº de notificaciones sin leer (para el badge del header). 0 si no hay sesión. */
export async function countUnreadNotifications(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
