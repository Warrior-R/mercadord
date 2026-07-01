import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import type { SearchFilters } from "@/lib/filters";
import {
  DEFAULT_PAGE_SIZE,
  rangeFor,
  totalPages,
  type Page,
} from "@/lib/pagination";

const COLUMNS =
  "id,user_id,title,description,price,old_price,category,condition,location,image_url,seller_name,rating,reviews,created_at";

// PostgREST devuelve este código cuando el offset pedido supera el total de
// filas: no es un fallo real, solo "estás más allá de la última página".
const RANGE_NOT_SATISFIABLE = "PGRST103";

/**
 * Búsqueda con texto libre + filtros, paginada. Devuelve items + total real
 * (count exact) para poder pintar controles de página.
 */
export async function searchProducts(
  f: SearchFilters,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<Page<Product>> {
  const supabase = await createClient();
  let query = supabase.from("products").select(COLUMNS, { count: "exact" });

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

  const { from, to } = rangeFor(page, pageSize);
  const { data, error, count } = await query.range(from, to);
  if (error && error.code !== RANGE_NOT_SATISFIABLE) throw new Error(error.message);
  const total = count ?? 0;
  return {
    items: error ? [] : ((data ?? []) as Product[]),
    total,
    page,
    pageSize,
    totalPages: totalPages(total, pageSize),
  };
}

/** Lista productos paginados, opcionalmente filtrados por categoría (key de la BD). */
export async function listProducts(
  opts: { category?: string; page?: number; pageSize?: number } = {},
): Promise<Page<Product>> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false });

  if (opts.category) query = query.eq("category", opts.category);

  const { from, to } = rangeFor(page, pageSize);
  const { data, error, count } = await query.range(from, to);
  if (error && error.code !== RANGE_NOT_SATISFIABLE) throw new Error(error.message);
  const total = count ?? 0;
  return {
    items: error ? [] : ((data ?? []) as Product[]),
    total,
    page,
    pageSize,
    totalPages: totalPages(total, pageSize),
  };
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
