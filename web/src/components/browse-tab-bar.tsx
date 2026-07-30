import Link from "next/link";
import { BROWSE_TABS, type BrowseTabKey } from "@/lib/browse-tabs";
import { browseHref, type BrowseParams } from "@/lib/browse-url";

/** Pestañas de exploración (Destacados · Más nuevos · Ofertas del día · Cerca de mí). */
export function BrowseTabBar({
  basePath,
  params,
  current,
}: {
  basePath: string;
  params: BrowseParams;
  current: BrowseTabKey;
}) {
  return (
    <nav
      aria-label="Formas de explorar"
      className="mb-5 flex gap-2 overflow-x-auto rounded-xl border border-line bg-white p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {BROWSE_TABS.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            href={browseHref(basePath, params, {
              tab: t.key === "destacados" ? undefined : t.key,
            })}
            aria-current={active ? "page" : undefined}
            className={
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
              (active
                ? "bg-primary text-white"
                : "text-ink-soft hover:bg-tile hover:text-primary")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
