import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

const COLUMNS =
  "id,user_id,title,description,price,old_price,category,condition,location,image_url,seller_name,rating,reviews,created_at";

/**
 * Ids de productos destacados vigentes (until nulo o futuro). Tolera que la
 * tabla featured_products no exista aún: devuelve un Set vacío.
 */
export async function listFeaturedIds(): Promise<Set<string>> {
  const supabase = await createClient();
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("featured_products")
      .select("product_id,until");
    if (error || !data) return new Set();
    const ids = data
      .filter((r) => !r.until || String(r.until) > nowIso)
      .map((r) => String(r.product_id));
    return new Set(ids);
  } catch {
    return new Set();
  }
}

/** Productos destacados vigentes, para la sección de portada. */
export async function listFeaturedProducts(limit = 10): Promise<Product[]> {
  const ids = await listFeaturedIds();
  if (ids.size === 0) return [];
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("products")
      .select(COLUMNS)
      .in("id", Array.from(ids))
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as Product[];
  } catch {
    return [];
  }
}

/** ¿Este producto está destacado ahora mismo? */
export async function isProductFeatured(productId: string): Promise<boolean> {
  const ids = await listFeaturedIds();
  return ids.has(productId);
}
