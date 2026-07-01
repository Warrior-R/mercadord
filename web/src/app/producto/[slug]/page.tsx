import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/products";
import { idFromSlug, formatPrice } from "@/lib/format";
import { conditionLabel } from "@/lib/filters";
import { categoryByKey } from "@/lib/categories";
import { SITE_URL } from "@/lib/site";
import { isProductFeatured } from "@/lib/featured";
import { ContactSeller } from "@/components/contact-seller";
import { SellerReviews } from "@/components/seller-reviews";
import { ReportListing } from "@/components/report-listing";
import { AdminFeaturedToggle } from "@/components/admin-featured-toggle";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    msg?: string;
    rev?: string;
    rep?: string;
    feat?: string;
  }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const product = id ? await getProductById(id) : null;
  if (!product) return { title: "Producto no encontrado" };

  const description =
    product.description?.slice(0, 160) ??
    `${product.title} en MercadoRD — República Dominicana.`;

  return {
    title: product.title,
    description,
    alternates: { canonical: `/producto/${slug}` },
    openGraph: {
      title: product.title,
      description,
      type: "website",
      url: `${SITE_URL}/producto/${slug}`,
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { msg, rev, rep, feat } = await searchParams;
  const id = idFromSlug(slug);
  const product = id ? await getProductById(id) : null;
  if (!product) notFound();

  const cat = categoryByKey(product.category);
  const featured = await isProductFeatured(product.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    image: product.image_url ?? undefined,
    category: cat?.name,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "DOP",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Ruta" className="mb-4 text-sm text-neutral-500">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>
        {cat && (
          <>
            {" / "}
            <Link href={`/categoria/${cat.slug}`} className="hover:underline">
              {cat.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-7xl">
              {cat?.icon ?? "📦"}
            </div>
          )}
        </div>

        <div>
          {featured && (
            <span className="mb-2 inline-block rounded-full bg-accent2 px-2.5 py-1 text-xs font-bold text-ink">
              ⭐ Anuncio destacado
            </span>
          )}
          <h1 className="text-2xl font-bold tracking-tight">{product.title}</h1>
          <p className="mt-3 text-3xl font-bold text-accent">
            {formatPrice(product.price)}
          </p>
          {product.old_price && product.old_price > product.price && (
            <p className="text-sm text-neutral-500 line-through">
              {formatPrice(product.old_price)}
            </p>
          )}

          <dl className="mt-4 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            {product.condition && (
              <div className="flex gap-2">
                <dt className="font-medium text-neutral-500">Condición:</dt>
                <dd>{conditionLabel(product.condition)}</dd>
              </div>
            )}
            {product.location && (
              <div className="flex gap-2">
                <dt className="font-medium text-neutral-500">Ubicación:</dt>
                <dd>{product.location}</dd>
              </div>
            )}
            {product.seller_name && (
              <div className="flex gap-2">
                <dt className="font-medium text-neutral-500">Vendedor:</dt>
                <dd>{product.seller_name}</dd>
              </div>
            )}
          </dl>

          {product.description && (
            <div className="mt-6">
              <h2 className="mb-1 text-sm font-semibold text-neutral-500">
                Descripción
              </h2>
              <p className="whitespace-pre-line text-neutral-800 dark:text-neutral-200">
                {product.description}
              </p>
            </div>
          )}

          <ContactSeller product={product} slug={slug} status={msg} />
          <SellerReviews product={product} slug={slug} status={rev} />
          <ReportListing product={product} slug={slug} status={rep} />
          <AdminFeaturedToggle product={product} slug={slug} status={feat} />
        </div>
      </div>
    </div>
  );
}
