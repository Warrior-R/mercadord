import { createClient } from "@/lib/supabase/server";

export type AdminStats = {
  products: number;
  reportsPending: number;
  featured: number;
  banners: number;
};

/** Métricas para el panel admin. Cada conteo es tolerante a tabla ausente. */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();

  const safeCount = async (
    run: () => PromiseLike<{ count: number | null; error: unknown }>,
  ) => {
    try {
      const { count, error } = await run();
      return error ? 0 : (count ?? 0);
    } catch {
      return 0;
    }
  };

  const [products, reportsPending, featured, banners] = await Promise.all([
    safeCount(() =>
      supabase.from("products").select("*", { count: "exact", head: true }),
    ),
    safeCount(() =>
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendiente"),
    ),
    safeCount(() =>
      supabase
        .from("featured_products")
        .select("*", { count: "exact", head: true }),
    ),
    safeCount(() =>
      supabase.from("ad_banners").select("*", { count: "exact", head: true }),
    ),
  ]);

  return { products, reportsPending, featured, banners };
}
