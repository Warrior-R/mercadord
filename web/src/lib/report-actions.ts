"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateReportInput } from "@/lib/report-validation";

export async function submitReport(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const backTo = slug ? `/producto/${slug}` : "/";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/entrar?next=${encodeURIComponent(backTo)}&message=${encodeURIComponent("Inicia sesión para reportar un anuncio.")}`,
    );
  }

  const report_type = String(formData.get("report_type") ?? "");
  const description = String(formData.get("description") ?? "");

  const errors = validateReportInput({ report_type, description });
  if (errors.length) {
    redirect(`${backTo}?rep=invalid`);
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reporter_email: user.email ?? null,
    target: `producto:${productId}`,
    report_type,
    description: description.trim().slice(0, 2000),
    source: "web",
  });

  if (error) redirect(`${backTo}?rep=error`);

  redirect(`${backTo}?rep=ok`);
}
