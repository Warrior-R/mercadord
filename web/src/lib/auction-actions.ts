"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";

/** Traduce el mensaje de excepción del RPC a un código de estado para la URL. */
function bidErrorCode(message: string): string {
  if (message.includes("AUTH_REQUIRED")) return "auth";
  if (message.includes("AUCTION_CLOSED")) return "closed";
  if (message.includes("OWN_AUCTION")) return "own";
  if (message.includes("BID_TOO_LOW")) return "low";
  if (message.includes("NO_BUYNOW")) return "nobuynow";
  if (message.includes("NOT_FOUND")) return "notfound";
  return "error";
}

/** Puja en una subasta usando el RPC atómico place_bid (server-side). */
export async function placeBid(formData: FormData) {
  const auctionId = String(formData.get("auction_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const amount = Number(formData.get("amount"));
  const backTo = slug ? `/subasta/${slug}` : "/subastas";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/entrar?next=${encodeURIComponent(backTo)}&message=${encodeURIComponent("Inicia sesión para pujar.")}`,
    );
  }
  if (!auctionId || !Number.isFinite(amount) || amount <= 0) {
    redirect(`${backTo}?bid=error`);
  }

  const { error } = await supabase.rpc("place_bid", {
    p_auction: auctionId,
    p_amount: amount,
  });
  if (error) redirect(`${backTo}?bid=${bidErrorCode(error.message)}`);

  revalidatePath(backTo);
  redirect(`${backTo}?bid=ok`);
}

/** Cierra la subasta comprando al precio "Cómpralo ya" (RPC buy_now). */
export async function buyNow(formData: FormData) {
  const auctionId = String(formData.get("auction_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const backTo = slug ? `/subasta/${slug}` : "/subastas";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/entrar?next=${encodeURIComponent(backTo)}&message=${encodeURIComponent("Inicia sesión para comprar.")}`,
    );
  }

  const { error } = await supabase.rpc("buy_now", { p_auction: auctionId });
  if (error) redirect(`${backTo}?bid=${bidErrorCode(error.message)}`);

  revalidatePath(backTo);
  redirect(`${backTo}?bid=bought`);
}

/** Crea una subasta a nombre del usuario (RLS: seller_id = auth.uid()). */
export async function createAuction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/subastas/crear");

  const title = String(formData.get("title") ?? "").trim();
  const start = Number(formData.get("start_price"));
  const buyRaw = Number(formData.get("buy_now_price"));
  const buy_now_price = Number.isFinite(buyRaw) && buyRaw > 0 ? buyRaw : null;
  const hours = Number(formData.get("hours"));
  const location = String(formData.get("location") ?? "").trim() || null;
  const image_url = String(formData.get("image_url") ?? "").trim() || null;
  const icon = String(formData.get("icon") ?? "").trim() || "📦";

  const errors: string[] = [];
  if (title.length < 3) errors.push("El título es muy corto.");
  if (!Number.isFinite(start) || start <= 0)
    errors.push("El precio inicial debe ser mayor que 0.");
  if (!Number.isFinite(hours) || hours < 1 || hours > 168)
    errors.push("La duración debe estar entre 1 y 168 horas.");
  if (buy_now_price !== null && buy_now_price <= start)
    errors.push("El precio 'Cómpralo ya' debe superar al inicial.");
  if (errors.length) {
    redirect(`/subastas/crear?error=${encodeURIComponent(errors.join(" "))}`);
  }

  const seller_name =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "Vendedor";
  const ends_at = new Date(Date.now() + hours * 3600_000).toISOString();

  const { data, error } = await supabase
    .from("auctions")
    .insert({
      seller_id: user.id,
      seller_name,
      title,
      icon,
      image_url,
      location,
      start_price: start,
      current_bid: start,
      bid_count: 0,
      buy_now_price,
      ends_at,
      status: "active",
    })
    .select("id,title")
    .single();

  if (error || !data) {
    redirect(
      `/subastas/crear?error=${encodeURIComponent(error?.message ?? "No se pudo crear la subasta.")}`,
    );
  }

  revalidatePath("/subastas");
  redirect(`/subasta/${slugify(data.title)}-${data.id}`);
}
