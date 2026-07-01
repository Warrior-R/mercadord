import Link from "next/link";
import { SearchBar } from "@/components/search-bar";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link
          href="/"
          className="shrink-0 text-lg font-extrabold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span className="text-blue-600">Marketplace</span>DR
        </Link>
        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
