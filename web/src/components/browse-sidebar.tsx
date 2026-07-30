import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { CONDITIONS } from "@/lib/filters";
import { browseHref, type BrowseParams } from "@/lib/browse-url";
import { PriceSlider } from "@/components/price-slider";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <h2 className="border-b border-line bg-tile px-4 py-2.5 text-sm font-bold text-primary">
        {title}
      </h2>
      <div className="p-2">{children}</div>
    </section>
  );
}

function itemClass(active: boolean): string {
  return (
    "block rounded-lg px-3 py-2 text-sm transition " +
    (active
      ? "bg-primary/10 font-semibold text-primary"
      : "text-ink-soft hover:bg-tile hover:text-primary")
  );
}

/**
 * Barra lateral de exploración: categorías, precio máximo y condición.
 * Cada opción es un enlace que preserva el resto de filtros de la URL.
 */
export function BrowseSidebar({
  basePath,
  params,
  category,
  condition,
  maxPrice,
}: {
  basePath: string;
  params: BrowseParams;
  category?: string;
  condition?: string;
  maxPrice?: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Categorías">
        <Link
          href={browseHref(basePath, params, { cat: undefined })}
          aria-current={!category ? "page" : undefined}
          className={itemClass(!category)}
        >
          Todas
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={browseHref(basePath, params, { cat: c.key })}
            aria-current={category === c.key ? "page" : undefined}
            className={itemClass(category === c.key)}
          >
            {c.name}
          </Link>
        ))}
      </Panel>

      <Panel title="Precio máximo (DOP)">
        <div className="px-2 pb-1 pt-2">
          <PriceSlider basePath={basePath} params={params} value={maxPrice} />
        </div>
      </Panel>

      <Panel title="Condición">
        <Link
          href={browseHref(basePath, params, { cond: undefined })}
          aria-current={!condition ? "page" : undefined}
          className={itemClass(!condition)}
        >
          Cualquiera
        </Link>
        {CONDITIONS.map((c) => (
          <Link
            key={c.value}
            href={browseHref(basePath, params, { cond: c.value })}
            aria-current={condition === c.value ? "page" : undefined}
            className={itemClass(condition === c.value)}
          >
            {c.label}
          </Link>
        ))}
      </Panel>
    </div>
  );
}
