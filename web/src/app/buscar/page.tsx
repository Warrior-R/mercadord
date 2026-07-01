import type { Metadata } from "next";
import { parseFilters, hasActiveFilters } from "@/lib/filters";
import { searchProducts } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { FilterPanel } from "@/components/filter-panel";
import { FiltersDrawer } from "@/components/filters-drawer";
import { SortSelect } from "@/components/sort-select";
import { SearchBar } from "@/components/search-bar";

export const dynamic = "force-dynamic";

// Las páginas de resultados no se indexan (evita duplicados vs /categoria/[slug]).
export const metadata: Metadata = {
  title: "Buscar",
  robots: { index: false, follow: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BuscarPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const products = await searchProducts(filters);

  const activeCount = [
    filters.category,
    filters.condition,
    filters.minPrice,
    filters.maxPrice,
    filters.location,
  ].filter(Boolean).length;

  // Filtros a preservar al buscar desde la barra (todos menos q).
  const hidden: Record<string, string> = {};
  if (filters.category) hidden.cat = filters.category;
  if (filters.condition) hidden.cond = filters.condition;
  if (filters.minPrice) hidden.min = String(filters.minPrice);
  if (filters.maxPrice) hidden.max = String(filters.maxPrice);
  if (filters.location) hidden.loc = filters.location;
  if (filters.sort !== "recent") hidden.sort = filters.sort;

  // Query actual SIN sort, para el SortSelect.
  const qw = new URLSearchParams();
  if (filters.q) qw.set("q", filters.q);
  if (filters.category) qw.set("cat", filters.category);
  if (filters.condition) qw.set("cond", filters.condition);
  if (filters.minPrice) qw.set("min", String(filters.minPrice));
  if (filters.maxPrice) qw.set("max", String(filters.maxPrice));
  if (filters.location) qw.set("loc", filters.location);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-5">
        <SearchBar defaultValue={filters.q ?? ""} hidden={hidden} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {filters.q ? `Resultados para “${filters.q}”` : "Todos los productos"}
          </h1>
          <p className="text-sm text-neutral-500">
            {products.length} resultado{products.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FiltersDrawer activeCount={activeCount}>
            <FilterPanel filters={filters} />
          </FiltersDrawer>
          <SortSelect value={filters.sort} query={qw.toString()} />
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 md:block" aria-label="Filtros">
          <FilterPanel filters={filters} />
        </aside>

        <div className="min-w-0 flex-1">
          {products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
              <p className="font-medium">Sin resultados</p>
              <p className="mt-1 text-sm text-neutral-500">
                {hasActiveFilters(filters)
                  ? "Prueba a quitar algún filtro o cambiar la búsqueda."
                  : "Aún no hay productos. Ejecuta supabase/seed-products.sql."}
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
