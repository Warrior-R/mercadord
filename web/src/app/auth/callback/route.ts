import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Intercambia el código OAuth/PKCE por una sesión y redirige.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/entrar?error=${encodeURIComponent("No se pudo completar el inicio de sesión.")}`,
  );
}
