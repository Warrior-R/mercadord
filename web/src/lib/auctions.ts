import { createClient } from "@/lib/supabase/server";

export type Auction = {
  id: string;
  seller_id: string | null;
  seller_name: string | null;
  title: string;
  icon: string | null;
  image_url: string | null;
  location: string | null;
  start_price: number;
  current_bid: number;
  bid_count: number | null;
  high_bidder: string | null;
  leader_masked: string | null;
  buy_now_price: number | null;
  min_increment: number | null;
  ends_at: string;
  status: string | null;
  winner_id: string | null;
  created_at: string | null;
};

export type MaskedBid = {
  masked: string;
  amount: number;
  created_at: string;
};

const COLUMNS =
  "id,seller_id,seller_name,title,icon,image_url,location,start_price,current_bid,bid_count,high_bidder,leader_masked,buy_now_price,min_increment,ends_at,status,winner_id,created_at";

/** Subastas activas (no vencidas), la que cierra antes primero. Tolerante. */
export async function listActiveAuctions(): Promise<Auction[]> {
  const supabase = await createClient();
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("auctions")
      .select(COLUMNS)
      .eq("status", "active")
      .gt("ends_at", nowIso)
      .order("ends_at", { ascending: true })
      .limit(60);
    if (error || !data) return [];
    return data as Auction[];
  } catch {
    return [];
  }
}

/** Una subasta por id, o null si no existe / sin acceso (RLS) / tabla ausente. */
export async function getAuctionById(id: string): Promise<Auction | null> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("auctions")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return data as Auction;
  } catch {
    return null;
  }
}

/** Feed público de pujas con nombres enmascarados (vía RPC get_auction_bids). */
export async function getAuctionBids(
  auctionId: string,
  limit = 12,
): Promise<MaskedBid[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.rpc("get_auction_bids", {
      p_auction: auctionId,
      p_limit: limit,
    });
    if (error || !data) return [];
    return data as MaskedBid[];
  } catch {
    return [];
  }
}

/** Subastas del vendedor (para su cuenta). Tolerante. */
export async function listAuctionsByUser(userId: string): Promise<Auction[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("auctions")
      .select(COLUMNS)
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as Auction[];
  } catch {
    return [];
  }
}
