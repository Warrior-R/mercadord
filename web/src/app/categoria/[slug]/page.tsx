import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryBySlug } from "@/lib/categories";
import { listProducts } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) return { title: "Categoría no encontrada" };
  return {
    title: cat.name,
    description: `Compra ${cat.name} en MercadoRD — República Dominicana.`,
    alternates: { canonical: `/categoria/${cat.slug}` },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) notFound();

  const products = await listProducts({ category: cat.key });

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-5">
      <nav aria-label="Ruta" className="mb-3 text-sm text-ink-soft">
        <Link href="/" className="hover:text-primary hover:underline">
          Inicio
        </Link>{" "}
        / <span className="text-ink">{cat.name}</span>
      </nav>

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
