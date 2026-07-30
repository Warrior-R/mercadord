import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { LEGAL_DOCS } from "@/lib/legal";
import { listProductRefs } from "@/lib/products";
import { slugify } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: Awaited<ReturnType<typeof listProductRefs>> = [];
  try {
    products = await listProductRefs();
  } catch {
    products = [];
  }

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE_URL}/subastas`,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    },
    ...CATEGORIES.map((c) => ({
      url: `${SITE_URL}/categoria/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...LEGAL_DOCS.map((d) => ({
      url: `${SITE_URL}/legal/${d.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...products.map((p) => ({
      url: `${SITE_URL}/producto/${slugify(p.title)}-${p.id}`,
      lastModified: p.created_at ? new Date(p.created_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
