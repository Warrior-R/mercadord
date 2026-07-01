"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Guarda o quita un producto de favoritos (toggle). Requiere sesión. */
export async function toggleFavorite(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  const backTo = String(formData.get("back_to") ?? "/");
  const isFav = String(formData.get("is_fav") ?? "") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/entrar?next=${encodeURIComponent(backTo)}&message=${encodeURIComponent("Inicia sesión para guardar favoritos.")}`,
    );
  }
  if (!productId) redirect(backTo);

  if (isFav) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);
  } else {
    // RLS ("gestionar propios") exige user_id = auth.uid().
    await supabase
      .from("favorites")
      .upsert(
        { user_id: user.id, product_id: productId },
        { onConflict: "user_id,product_id" },
      );
  }

  revalidatePath(backTo);
  revalidatePath("/favoritos");
}
