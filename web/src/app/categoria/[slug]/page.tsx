import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryBySlug } from "@/lib/categories";
import { listProducts } from "@/lib/products";
import { listMyFavoriteIds } from "@/lib/favorites";
import { parsePage } from "@/lib/pagination";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
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
  // Canonical incluye la página (>1) para no canibalizar el ranking entre páginas.
  const canonical =
    page > 1
      ? `/categoria/${cat.slug}?page=${page}`
      : `/categoria/${cat.slug}`;
  return {
    title: page > 1 ? `${cat.name} — página ${page}` : cat.name,
    description: `Compra ${cat.name} en MercadoRD — República Dominicana.`,
    alternates: { canonical },
  };
}

export default async function CategoryPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const cat = categoryBySlug(slug);
  if (!cat) notFound();

  const [result, favoriteIds] = await Promise.all([
    listProducts({ category: cat.key, page }),
    listMyFavoriteIds(),
  ]);
  const products = result.items;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-5">
      <Breadcrumbs
        items={[{ name: "Inicio", href: "/" }, { name: cat.name }]}
      />

      <h1 className="mb-5 text-2xl font-bold tracking-tight text-ink">
        <span aria-hidden className="mr-2">
          {cat.icon}
        </span>
        {cat.name}
      </h1>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="font-medium">Sin productos en {cat.name} todavía</p>
          <p className="mt-1 text-sm text-neutral-500">
            Vuelve pronto o explora otras categorías.
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
                  backTo={`/categoria/${cat.slug}`}
                />
              </li>
            ))}
          </ul>
          <Pagination
            basePath={`/categoria/${cat.slug}`}
            params={{}}
            page={result.page}
            totalPages={result.totalPages}
          />
        </>
      )}
    </div>
  );
}
