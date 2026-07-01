import Link from "next/link";
import Image from "next/image";
import type { Auction } from "@/lib/auctions";
import { formatPrice, auctionHref } from "@/lib/format";
import { AuctionCountdown } from "@/components/auction-countdown";

export function AuctionCard({ auction }: { auction: Auction }) {
  return (
    <Link
      href={auctionHref(auction)}
      className="group flex flex-col overflow-hidden rounded-[10px] border border-line bg-card transition duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,48,135,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
    >
      <div className="relative flex aspect-square items-center justify-center bg-tile">
        <span className="absolute left-2 top-2 z-10 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white shadow">
          🔨 Subasta
        </span>
        {auction.image_url ? (
          <Image
            src={auction.image_url}
            alt={auction.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <span className="text-6xl">{auction.icon ?? "📦"}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">
          {auction.title}
        </h3>
        <div className="mt-auto pt-2">
          <p className="text-[11px] text-ink-soft">Puja actual</p>
          <p className="text-lg font-bold text-accent">
            {formatPrice(auction.current_bid)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-ink-soft">
            <AuctionCountdown endsAt={auction.ends_at} />
            <span>
              {auction.bid_count ?? 0} puja{(auction.bid_count ?? 0) === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
