import type { Metadata } from "next";
import Link from "next/link";
import { signIn, signInWithGoogle } from "@/lib/auth-actions";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

type Props = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function EntrarPage({ searchParams }: Props) {
  const { error, message } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-xl border border-line bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold text-ink">Entrar a MercadoRD</h1>
        <p className="mt-1 text-sm text-ink-soft">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-primary hover:underline">
            Crear una
          </Link>
        </p>

        {message && (
          <p className="mt-4 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <form action={signIn} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Correo</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Contraseña</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
            />
          </label>
          <button
            type="submit"
            className="mt-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
          >
            Entrar
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-ink-soft">
          <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
        </div>

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-tile focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
          >
            <span aria-hidden>🇬</span> Continuar con Google
          </button>
        </form>
      </div>
    </div>
  );
}
