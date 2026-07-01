"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Destaca o retira un producto (toggle). La RLS de featured_products exige
 * que el usuario sea admin, así que aquí no reimplementamos el chequeo:
 * si no es admin, el insert/delete falla y volvemos con error.
 */
export async function toggleFeatured(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const makeFeatured = String(formData.get("featured") ?? "") === "1";
  const backTo = slug ? `/producto/${slug}` : "/";

  if (!productId) redirect(`${backTo}?feat=error`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(backTo)}`);

  const { error } = makeFeatured
    ? await supabase
        .from("featured_products")
        .upsert({ product_id: productId }, { onConflict: "product_id" })
    : await supabase.from("featured_products").delete().eq("product_id", productId);

  if (error) redirect(`${backTo}?feat=error`);

  revalidatePath("/");
  revalidatePath(backTo);
  redirect(`${backTo}?feat=ok`);
}
