"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { validateProductInput } from "@/lib/product-validation";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/entrar?next=/vender&message=${encodeURIComponent("Inicia sesión para publicar un producto.")}`,
    );
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = Number(formData.get("price"));
  const oldRaw = Number(formData.get("old_price"));
  const old_price = Number.isFinite(oldRaw) && oldRaw > 0 ? oldRaw : null;
  const category = String(formData.get("category") ?? "");
  const condition = String(formData.get("condition") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  const image_url = String(formData.get("image_url") ?? "").trim() || null;

  const errors = validateProductInput({ title, price, category, condition, image_url });
  if (errors.length) {
    redirect(`/vender?error=${encodeURIComponent(errors.join(" "))}`);
  }

  const seller_name =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "Vendedor";

  const { data, error } = await supabase
    .from("products")
    .insert({
      user_id: user.id,
      title,
      description,
      price,
      old_price,
      category,
      condition,
      location,
      image_url,
      seller_name,
    })
    .select("id,title")
    .single();

  if (error || !data) {
    redirect(
      `/vender?error=${encodeURIComponent(error?.message ?? "No se pudo publicar el producto.")}`,
    );
  }

  revalidatePath("/");
  redirect(`/producto/${slugify(data.title)}-${data.id}`);
}
