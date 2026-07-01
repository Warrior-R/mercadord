import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryBySlug } from "@/lib/categories";
import { listProducts } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { CategoryNav } from "@/components/category-nav";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) return { title: "Categoría no encontrada" };
  return {
    title: cat.name,
    description: `Compra ${cat.name} en MarketplaceDR — República Dominicana.`,
    alternates: { canonical: `/categoria/${cat.slug}` },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) notFound();

  const products = await listProducts({ category: cat.key });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav aria-label="Ruta" className="mb-3 text-sm text-neutral-500">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>{" "}
        / <span className="text-neutral-700 dark:text-neutral-300">{cat.name}</span>
      </nav>

      <h1 className="mb-4 text-2xl font-bold tracking-tight">
        <span aria-hidden className="mr-2">
          {cat.icon}
        </span>
        {cat.name}
      </h1>

      <div className="mb-6">
        <CategoryNav activeSlug={cat.slug} />
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="font-medium">Sin productos en {cat.name} todavía</p>
          <p className="mt-1 text-sm text-neutral-500">
            Vuelve pronto o explora otras categorías.
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
  );
}
