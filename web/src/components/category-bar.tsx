"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

/** Barra de categorías tipo pestañas (nav claro estilo eBay), bajo el header. */
export function CategoryBar() {
  const pathname = usePathname();
  const auctionsActive = pathname.startsWith("/subasta");

  const base =
    "whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] transition focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <div className="border-b border-line bg-white">
      <nav
        aria-label="Categorías"
        className="mx-auto flex max-w-[1280px] gap-1 overflow-x-auto px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Link
          href="/subastas"
          aria-current={auctionsActive ? "page" : undefined}
          className={
            base +
            " font-bold " +
            (auctionsActive
              ? "border-accent2 text-accent"
              : "border-transparent text-accent hover:border-accent2")
          }
        >
          Subastas
        </Link>
        {CATEGORIES.map((c) => {
          const active = pathname === `/categoria/${c.slug}`;
          return (
            <Link
              key={c.slug}
              href={`/categoria/${c.slug}`}
              aria-current={active ? "page" : undefined}
              className={
                base +
                " font-medium " +
                (active
                  ? "border-accent2 text-primary"
                  : "border-transparent text-ink-soft hover:border-accent2 hover:text-primary")
              }
            >
              {c.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
