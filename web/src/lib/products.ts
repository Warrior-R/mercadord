import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import type { SearchFilters } from "@/lib/filters";

const COLUMNS =
  "id,title,description,price,old_price,category,condition,location,image_url,seller_name,rating,reviews,created_at";

/** Búsqueda con texto libre + filtros (categoría, condición, precio, ubicación, orden). */
export async function searchProducts(f: SearchFilters): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase.from("products").select(COLUMNS);

  if (f.q) {
    // Sanea el término: las comas/paréntesis/% romperían la sintaxis de .or().
    const safe = f.q.replace(/[%,()]/g, " ").trim();
    if (safe) {
      query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }
  }
  if (f.category) query = query.eq("category", f.category);
  if (f.condition) query = query.eq("condition", f.condition);
  if (f.minPrice) query = query.gte("price", f.minPrice);
  if (f.maxPrice) query = query.lte("price", f.maxPrice);
  if (f.location) query = query.ilike("location", `%${f.location}%`);

  if (f.sort === "price_asc") query = query.order("price", { ascending: true });
  else if (f.sort === "price_desc")
    query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data, error } = await query.limit(60);
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

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

/** Productos publicados por un usuario (para su cuenta). */
export async function listProductsByUser(userId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
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
