import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuctionById, getAuctionBids } from "@/lib/auctions";
import { idFromSlug, formatPrice } from "@/lib/format";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AuctionLive } from "@/components/auction-live";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bid?: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const auction = id ? await getAuctionById(id) : null;
  if (!auction) return { title: "Subasta no encontrada" };
  return {
    title: `${auction.title} — subasta`,
    description: `Puja por ${auction.title} en MercadoRD. Puja actual: ${formatPrice(auction.current_bid)}.`,
    robots: { index: auction.status === "active", follow: true },
  };
}

export default async function AuctionPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { bid } = await searchParams;
  const id = idFromSlug(slug);
  const auction = id ? await getAuctionById(id) : null;
  if (!auction) notFound();

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    bids,
  ] = await Promise.all([supabase.auth.getUser(), getAuctionBids(auction.id)]);

  const isOwner = !!user && user.id === auction.seller_id;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Subastas", href: "/subastas" },
          { name: auction.title },
        ]}
      />

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-tile">
          {auction.image_url ? (
            <Image
              src={auction.image_url}
              alt={auction.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <span className="text-8xl">{auction.icon ?? "📦"}</span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {auction.title}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
              {auction.location && <span>{auction.location}</span>}
              {auction.seller_name && (
                <span>
                  Vendedor:{" "}
                  {auction.seller_id ? (
                    <Link
                      href={`/vendedor/${auction.seller_id}`}
                      className="text-primary hover:underline"
                    >
                      {auction.seller_name}
                    </Link>
                  ) : (
                    auction.seller_name
                  )}
                </span>
              )}
              <span>Inició en {formatPrice(auction.start_price)}</span>
            </div>
          </div>

          <AuctionLive
            auctionId={auction.id}
            slug={slug}
            initialCurrentBid={auction.current_bid}
            initialBidCount={auction.bid_count ?? 0}
            initialEndsAt={auction.ends_at}
            initialLeader={auction.leader_masked}
            initialStatus={auction.status ?? "active"}
            buyNowPrice={auction.buy_now_price}
            isOwner={isOwner}
            isLoggedIn={!!user}
            bidStatus={bid}
          />

          <section
            aria-label="Historial de pujas"
            className="rounded-xl border border-line bg-tile p-4"
          >
            <h2 className="text-sm font-semibold text-ink">
              Historial de pujas
            </h2>
            {bids.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">
                Todavía no hay pujas. ¡Sé el primero!
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {bids.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between py-1.5 text-sm"
                  >
                    <span className="text-ink-soft">{b.masked}</span>
                    <span className="font-semibold text-ink">
                      {formatPrice(b.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
