import Link from "next/link";
import { listProducts } from "@/lib/products";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products: Product[] = [];
  let loadError: string | null = null;
  try {
    products = await listProducts({ limit: 24 });
  } catch (e) {
    loadError = e instanceof Error ? e.message : "error desconocido";
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-5">
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
              href="/buscar"
              className="rounded-lg border-2 border-white/60 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Ver categorías
            </Link>
          </div>
        </div>
      </section>

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
          <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
