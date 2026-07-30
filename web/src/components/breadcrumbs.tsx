import Link from "next/link";
import { SITE_URL } from "@/lib/site";

export type Crumb = { name: string; href?: string };

/**
 * Migas de pan con datos estructurados (BreadcrumbList de schema.org) para SEO.
 * El último elemento es la página actual (sin enlace).
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: `${SITE_URL}${c.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="Ruta" className="mb-4 text-sm text-ink-soft">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {c.href ? (
              <Link href={c.href} className="hover:text-primary hover:underline">
                {c.name}
              </Link>
            ) : (
              <span className="text-ink" aria-current="page">
                {c.name}
              </span>
            )}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
