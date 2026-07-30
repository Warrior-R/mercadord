import Link from "next/link";
import { searchProducts } from "@/lib/products";
import { listFeaturedIds } from "@/lib/featured";
import { listMyFavoriteIds } from "@/lib/favorites";
import type { Product } from "@/lib/types";
import { parseFilters, hasActiveFilters } from "@/lib/filters";
import { parsePage, type Page } from "@/lib/pagination";
import {
  parseTab,
  tabWantsDeals,
  tabWantsLocation,
} from "@/lib/browse-tabs";
import type { BrowseParams } from "@/lib/browse-url";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import { BannerStrip } from "@/components/banner-strip";
import { BrowseSidebar } from "@/components/browse-sidebar";
import { BrowseTabBar } from "@/components/browse-tab-bar";
import { BrowseEmptyState } from "@/components/browse-empty-state";
import { ProvincePicker } from "@/components/province-picker";
import { FiltersDrawer } from "@/components/filters-drawer";

export const dynamic = "force-dynamic";

const BASE = "/";

const EMPTY_PAGE: Page<Product> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 24,
  totalPages: 1,
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const tab = parseTab(sp.tab);

  // Los filtros vienen de la URL; la pestaña añade su propio criterio.
  const urlFilters = parseFilters(sp);
  const filters = {
    ...urlFilters,
    deals: tabWantsDeals(tab) ? true : urlFilters.deals,
  };

  // "Cerca de mí" exige provincia: sin ella no se listan anuncios.
  const needsProvince = tabWantsLocation(tab) && !filters.location;

  let result: Page<Product> = EMPTY_PAGE;
  let loadError: string | null = null;
  let featuredIds = new Set<string>();
  let favoriteIds = new Set<string>();
  try {
    [result, featuredIds, favoriteIds] = await Promise.all([
      needsProvince
        ? Promise.resolve(EMPTY_PAGE)
        : searchProducts(filters, page),
      listFeaturedIds(),
      listMyFavoriteIds(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "error desconocido";
  }

  let products = result.items;
  // En "Destacados" los anuncios promocionados van primero.
  if (tab === "destacados" && featuredIds.size > 0) {
    products = [...products].sort(
      (a, b) =>
        Number(featuredIds.has(b.id)) - Number(featuredIds.has(a.id)),
    );
  }

  // Parámetros que deben sobrevivir a cada enlace de filtro/pestaña.
  const params: BrowseParams = {
    tab: tab === "destacados" ? undefined : tab,
    cat: filters.category,
    cond: filters.condition,
    max: filters.maxPrice ? String(filters.maxPrice) : undefined,
    loc: filters.location,
    sort: filters.sort !== "recent" ? filters.sort : undefined,
  };

  const sidebar = (
    <BrowseSidebar
      basePath={BASE}
      params={params}
      category={filters.category}
      condition={filters.condition}
      maxPrice={filters.maxPrice}
    />
  );

  const activeCount = [
    filters.category,
    filters.condition,
    filters.maxPrice,
    filters.location,
  ].filter(Boolean).length;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-5">
      {page === 1 && <BannerStrip slot="top" />}

      <section className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-[#003087] via-[#0a4ab8] to-[#1565c0] px-6 py-10 text-center text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -left-12 h-52 w-52 rounded-full bg-white/5"
        />
        <div className="relative">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Compra y vende en República Dominicana
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm opacity-85">
            Publica gratis, contacta al vendedor y participa en subastas en
            vivo.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/vender"
              className="rounded-lg bg-accent2 px-6 py-3 text-sm font-bold text-ink transition hover:-translate-y-px hover:shadow-lg"
            >
              Publicar anuncio gratis
            </Link>
            <Link
              href="/subastas"
              className="rounded-lg border-2 border-accent2 px-6 py-3 text-sm font-bold text-accent2 transition hover:bg-accent2 hover:text-ink"
            >
              Ver subastas
            </Link>
          </div>
        </div>
      </section>

      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filtros">
          <div className="sticky top-24">{sidebar}</div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-3 lg:hidden">
            <FiltersDrawer activeCount={activeCount}>{sidebar}</FiltersDrawer>
          </div>

          <BrowseTabBar basePath={BASE} params={params} current={tab} />

          {tabWantsLocation(tab) && (
            <ProvincePicker
              basePath={BASE}
              params={params}
              value={filters.location}
            />
          )}

          {loadError ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
              No se pudo cargar el catálogo: {loadError}
            </p>
          ) : needsProvince ? (
            <div className="rounded-xl border border-dashed border-line bg-white p-12 text-center">
              <h2 className="text-lg font-bold text-ink">
                Elige tu provincia
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
                Selecciona arriba dónde estás y te mostramos los anuncios
                publicados cerca de ti.
              </p>
            </div>
          ) : products.length === 0 ? (
            <BrowseEmptyState
              basePath={BASE}
              hasFilters={hasActiveFilters(filters)}
            />
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <li key={p.id}>
                    <ProductCard
                      product={p}
                      featured={featuredIds.has(p.id)}
                      favorited={favoriteIds.has(p.id)}
                      backTo={BASE}
                    />
                  </li>
                ))}
              </ul>
              <Pagination
                basePath={BASE}
                params={params}
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
