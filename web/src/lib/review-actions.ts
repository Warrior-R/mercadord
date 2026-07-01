"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateReviewInput } from "@/lib/review-validation";

export async function submitReview(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const backTo = slug ? `/producto/${slug}` : "/";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/entrar?next=${encodeURIComponent(backTo)}&message=${encodeURIComponent("Inicia sesión para dejar una reseña.")}`,
    );
  }

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const errors = validateReviewInput({ rating, comment });
  if (errors.length) {
    redirect(`${backTo}?rev=invalid`);
  }

  // El vendedor se resuelve en el servidor a partir del producto; no se confía en el cliente.
  const { data: prod } = await supabase
    .from("products")
    .select("user_id")
    .eq("id", productId)
    .maybeSingle();

  if (!prod?.user_id) redirect(`${backTo}?rev=error`);
  if (prod.user_id === user.id) redirect(`${backTo}?rev=self`);

  // Upsert: una reseña por par (seller, reviewer). Editar en vez de duplicar.
  const { error } = await supabase.from("seller_reviews").upsert(
    {
      seller_id: prod.user_id,
      reviewer_id: user.id,
      rating,
      comment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "seller_id,reviewer_id" },
  );

  if (error) redirect(`${backTo}?rev=error`);

  revalidatePath(backTo);
  redirect(`${backTo}?rev=ok`);
}
