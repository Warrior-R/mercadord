import Link from "next/link";
import { SearchBar } from "@/components/search-bar";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-primary shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-5">
        <Link
          href="/"
          className="shrink-0 text-2xl font-bold tracking-tight text-white transition hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
        >
          Mercado<span className="text-accent2">RD</span>
        </Link>
        <div className="min-w-0 max-w-[620px] flex-1">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
