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
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light " +
              (active
                ? "border-primary bg-primary text-white"
                : "border-line bg-card text-ink-soft hover:border-primary/40 hover:text-primary")
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
