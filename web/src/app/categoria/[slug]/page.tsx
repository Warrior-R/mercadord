import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryBySlug } from "@/lib/categories";
import { searchProducts } from "@/lib/products";
import { listMyFavoriteIds } from "@/lib/favorites";
import { parseFilters } from "@/lib/filters";
import { parsePage } from "@/lib/pagination";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FilterPanel } from "@/components/filter-panel";
import { FiltersDrawer } from "@/components/filters-drawer";
import { SortSelect } from "@/components/sort-select";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Params): Promise<Metadata> {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const cat = categoryBySlug(slug);
  if (!cat) return { title: "Categoría no encontrada" };
  const canonical =
    page > 1 ? `/categoria/${cat.slug}?page=${page}` : `/categoria/${cat.slug}`;
  return {
    title: page > 1 ? `${cat.name} — página ${page}` : cat.name,
    description: `Compra ${cat.name} en MercadoRD — República Dominicana.`,
    alternates: { canonical },
  };
}

export default async function CategoryPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = categoryBySlug(slug);
  if (!cat) notFound();

  const base = `/categoria/${cat.slug}`;
  const page = parsePage(sp.page);
  // La categoría la fija la ruta; el resto de filtros vienen de la URL.
  const filters = { ...parseFilters(sp), category: cat.key };

  const [result, favoriteIds] = await Promise.all([
    searchProducts(filters, page),
    listMyFavoriteIds(),
  ]);
  const products = result.items;

  const activeCount = [
    filters.condition,
    filters.minPrice,
    filters.maxPrice,
    filters.location,
  ].filter(Boolean).length;

  // Params (sin categoría, que va en la ruta) para orden y paginación.
  const sortQuery = new URLSearchParams();
  if (filters.condition) sortQuery.set("cond", filters.condition);
  if (filters.minPrice) sortQuery.set("min", String(filters.minPrice));
  if (filters.maxPrice) sortQuery.set("max", String(filters.maxPrice));
  if (filters.location) sortQuery.set("loc", filters.location);

  const pageParams: Record<string, string | undefined> = {
    cond: filters.condition || undefined,
    min: filters.minPrice ? String(filters.minPrice) : undefined,
    max: filters.maxPrice ? String(filters.maxPrice) : undefined,
    loc: filters.location || undefined,
    sort: filters.sort !== "recent" ? filters.sort : undefined,
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-5">
      <Breadcrumbs
        items={[{ name: "Inicio", href: "/" }, { name: cat.name }]}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {cat.name}
          </h1>
          <p className="text-sm text-ink-soft">
            {result.total} anuncio{result.total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FiltersDrawer activeCount={activeCount}>
            <FilterPanel filters={filters} action={base} lockedCategory />
          </FiltersDrawer>
          <SortSelect
            value={filters.sort}
            query={sortQuery.toString()}
            basePath={base}
          />
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 md:block" aria-label="Filtros">
          <div className="sticky top-20 rounded-xl border border-line bg-white p-4">
            <h2 className="mb-4 text-sm font-bold text-ink">Filtrar</h2>
            <FilterPanel filters={filters} action={base} lockedCategory />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-card p-10 text-center">
              <p className="font-semibold text-ink">
                Sin anuncios en {cat.name}
                {activeCount > 0 ? " con esos filtros" : " todavía"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {activeCount > 0
                  ? "Prueba a quitar algún filtro."
                  : "Vuelve pronto o explora otras categorías."}
              </p>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <li key={p.id}>
                    <ProductCard
                      product={p}
                      favorited={favoriteIds.has(p.id)}
                      backTo={base}
                    />
                  </li>
                ))}
              </ul>
              <Pagination
                basePath={base}
                params={pageParams}
                page={result.page}
                totalPages={result.totalPages}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
