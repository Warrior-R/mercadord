import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

const COLUMNS =
  "id,title,description,price,old_price,category,condition,location,image_url,seller_name,rating,reviews,created_at";

/** Lista productos, opcionalmente filtrados por categoría (key de la BD). */
export async function listProducts(
  opts: { category?: string; limit?: number } = {},
): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(COLUMNS)
    .order("created_at", { ascending: false });

  if (opts.category) query = query.eq("category", opts.category);
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

/** Obtiene un producto por id, o null si no existe. */
export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Product | null) ?? null;
}

/** Ids + títulos para el sitemap dinámico. */
export async function listProductRefs(): Promise<
  { id: string; title: string; created_at: string | null }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,title,created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; title: string; created_at: string | null }[];
}
