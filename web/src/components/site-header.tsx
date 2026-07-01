import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { UserMenu } from "@/components/user-menu";

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
        <Link
          href="/vender"
          className="hidden shrink-0 rounded-md bg-accent2 px-3 py-1.5 text-xs font-bold text-ink transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white md:inline-block"
        >
          + Vender
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}
