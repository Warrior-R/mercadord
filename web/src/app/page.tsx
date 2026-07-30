import Link from "next/link";
import { listProducts } from "@/lib/products";
import { listFeaturedProducts, listFeaturedIds } from "@/lib/featured";
import { listMyFavoriteIds } from "@/lib/favorites";
import type { Product } from "@/lib/types";
import { parsePage, type Page } from "@/lib/pagination";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import { BannerStrip } from "@/components/banner-strip";

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let result: Page<Product> = EMPTY_PAGE;
  let loadError: string | null = null;
  let featured: Product[] = [];
  let featuredIds = new Set<string>();
  let favoriteIds = new Set<string>();
  try {
    [result, featured, featuredIds, favoriteIds] = await Promise.all([
      listProducts({ page }),
      // Los destacados sí se muestran completos (no dependen de la página).
      listFeaturedProducts(),
      listFeaturedIds(),
      listMyFavoriteIds(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "error desconocido";
  }

  const products = result.items;

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
            Miles de productos y subastas. Compra, vende y subasta de forma
            segura.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/buscar"
              className="rounded-lg bg-accent2 px-6 py-3 text-sm font-bold text-ink transition hover:-translate-y-px hover:shadow-lg"
            >
              Explorar productos
            </Link>
            <Link
              href="/subastas"
              className="rounded-lg border-2 border-accent2 px-6 py-3 text-sm font-bold text-accent2 transition hover:bg-accent2 hover:text-ink"
            >
              🔨 Ver subastas
            </Link>
          </div>
        </div>
      </section>

      {featured.length > 0 && page === 1 && (
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink">
            <span aria-hidden>⭐</span> Anuncios destacados
          </h2>
          <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {featured.map((p) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  featured
                  favorited={favoriteIds.has(p.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-base font-bold text-ink">
          Publicaciones recientes
        </h2>

        {loadError ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            No se pudo cargar el catálogo: {loadError}
          </p>
        ) : products.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line bg-card p-10 text-center">
            <p className="text-4xl">🛒</p>
            <p className="mt-3 font-semibold text-ink">
              Aún no hay productos publicados
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Ejecuta <code>supabase/seed-products.sql</code> para poblar el
              catálogo de desarrollo, o publica un producto.
            </p>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((p) => (
                <li key={p.id}>
                  <ProductCard
                    product={p}
                    featured={featuredIds.has(p.id)}
                    favorited={favoriteIds.has(p.id)}
                  />
                </li>
              ))}
            </ul>
            <Pagination
              basePath="/"
              params={{}}
              page={result.page}
              totalPages={result.totalPages}
            />
          </>
        )}
      </section>
    </div>
  );
}
