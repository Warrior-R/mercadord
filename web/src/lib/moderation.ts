import { createClient } from "@/lib/supabase/server";

export type Report = {
  id: string;
  reporter_email: string | null;
  target: string;
  report_type: string;
  description: string;
  status: string;
  admin_notes: string | null;
  source: string | null;
  created_at: string | null;
};

/** ¿El usuario actual es administrador? (profiles.is_admin). */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

/**
 * Reportes para moderación. La RLS ya limita la lectura a admins; si no lo eres
 * o la tabla no existe, devuelve []. Filtra por estado opcionalmente.
 */
export async function listReports(status?: string): Promise<Report[]> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from("reports")
      .select(
        "id,reporter_email,target,report_type,description,status,admin_notes,source,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error || !data) return [];
    return data as Report[];
  } catch {
    return [];
  }
}
