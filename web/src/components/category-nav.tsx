import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export function CategoryNav({ activeSlug }: { activeSlug?: string }) {
  return (
    <nav aria-label="Categorías" className="flex flex-wrap gap-2">
      {CATEGORIES.map((c) => {
        const active = c.slug === activeSlug;
        return (
          <Link
            key={c.slug}
            href={`/categoria/${c.slug}`}
            aria-current={active ? "page" : undefined}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
              (active
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300")
            }
          >
            <span aria-hidden>{c.icon}</span>
            {c.name}
          </Link>
        );
      })}
    </nav>
  );
}
