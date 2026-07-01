import Link from "next/link";
import { listProducts } from "@/lib/products";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { CategoryNav } from "@/components/category-nav";

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
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
          MercadoRD
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Compra y vende en República Dominicana
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Explora productos por categoría. Compra, vende y subasta de forma
          segura.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="sr-only">Categorías</h2>
        <CategoryNav />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Publicaciones recientes</h2>

        {loadError ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            No se pudo cargar el catálogo: {loadError}
          </p>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
            <p className="text-4xl">🛒</p>
            <p className="mt-3 font-medium">Aún no hay productos publicados</p>
            <p className="mt-1 text-sm text-neutral-500">
              Ejecuta <code>supabase/seed-products.sql</code> para poblar el
              catálogo de desarrollo, o publica un producto.
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
      </section>

      <footer className="mt-12 border-t border-neutral-200 pt-6 text-sm text-neutral-500 dark:border-neutral-800">
        <Link href="/categoria/electronica" className="underline">
          Ver Electrónica
        </Link>
      </footer>
    </div>
  );
}
