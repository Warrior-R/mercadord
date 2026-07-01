"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function isHttpUrl(v: string): boolean {
  return /^https?:\/\/.+/i.test(v);
}

/** Crea un banner. La RLS de ad_banners exige que el usuario sea admin. */
export async function createBanner(formData: FormData) {
  const slotRaw = String(formData.get("slot") ?? "top");
  const slot = slotRaw === "footer" ? "footer" : "top";
  const title = String(formData.get("title") ?? "").trim() || null;
  const image_url = String(formData.get("image_url") ?? "").trim();
  const link_url = String(formData.get("link_url") ?? "").trim();
  const sort = Number(formData.get("sort")) || 0;

  if (!isHttpUrl(image_url) || !isHttpUrl(link_url)) {
    redirect("/admin/banners?m=invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/admin/banners");

  const { error } = await supabase
    .from("ad_banners")
    .insert({ slot, title, image_url, link_url, sort, active: true });
  if (error) redirect("/admin/banners?m=error");

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners?m=ok");
}

/** Activa/desactiva un banner. */
export async function toggleBanner(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "1";
  if (!id) redirect("/admin/banners?m=invalid");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/admin/banners");

  const { error } = await supabase
    .from("ad_banners")
    .update({ active })
    .eq("id", id);
  if (error) redirect("/admin/banners?m=error");

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners?m=ok");
}

/** Elimina un banner. */
export async function deleteBanner(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/banners?m=invalid");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/admin/banners");

  const { error } = await supabase.from("ad_banners").delete().eq("id", id);
  if (error) redirect("/admin/banners?m=error");

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners?m=deleted");
}
