"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

/** Barra de navegación de categorías bajo el header (estilo .nav del sitio actual). */
export function CategoryBar() {
  const pathname = usePathname();

  return (
    <div className="bg-primary-light">
      <nav
        aria-label="Categorías"
        className="mx-auto flex max-w-[1280px] gap-0 overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CATEGORIES.map((c) => {
          const active = pathname === `/categoria/${c.slug}`;
          return (
            <Link
              key={c.slug}
              href={`/categoria/${c.slug}`}
              aria-current={active ? "page" : undefined}
              className={
                "whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent2 " +
                (active
                  ? "border-accent2 text-white"
                  : "border-transparent text-white/85 hover:border-accent2 hover:text-white")
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
