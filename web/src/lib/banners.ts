import { createClient } from "@/lib/supabase/server";

export type Banner = {
  id: string;
  slot: string;
  title: string | null;
  image_url: string;
  link_url: string;
  active: boolean;
  sort: number;
  created_at: string | null;
};

const COLUMNS = "id,slot,title,image_url,link_url,active,sort,created_at";

/** Banners ACTIVOS de un slot, para mostrar al público. Tolerante a tabla ausente. */
export async function listActiveBanners(
  slot: "top" | "footer" = "top",
): Promise<Banner[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("ad_banners")
      .select(COLUMNS)
      .eq("slot", slot)
      .eq("active", true)
      .order("sort", { ascending: true });
    if (error || !data) return [];
    return data as Banner[];
  } catch {
    return [];
  }
}

/** Todos los banners (para el panel admin; la RLS ya limita la escritura a admin). */
export async function listAllBanners(): Promise<Banner[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("ad_banners")
      .select(COLUMNS)
      .order("slot", { ascending: true })
      .order("sort", { ascending: true });
    if (error || !data) return [];
    return data as Banner[];
  } catch {
    return [];
  }
}
