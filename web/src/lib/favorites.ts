import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

const COLUMNS =
  "id,user_id,title,description,price,old_price,category,condition,location,image_url,seller_name,rating,reviews,created_at";

/** Ids de productos que el usuario actual tiene en favoritos. Set vacío si no hay sesión. */
export async function listMyFavoriteIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();
  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", user.id);
    if (error || !data) return new Set();
    return new Set(data.map((r) => String(r.product_id)));
  } catch {
    return new Set();
  }
}

/** Productos favoritos del usuario actual, para la página /favoritos. */
export async function listMyFavorites(): Promise<Product[]> {
  const ids = await listMyFavoriteIds();
  if (ids.size === 0) return [];
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("products")
      .select(COLUMNS)
      .in("id", Array.from(ids))
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as Product[];
  } catch {
    return [];
  }
}
