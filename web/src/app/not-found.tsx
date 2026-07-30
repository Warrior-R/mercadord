import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-3 text-xl font-bold text-ink">Página no encontrada</h1>
      <p className="mt-2 text-sm text-ink-soft">
        La página que buscas no existe o fue movida.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light"
        >
          Ir al inicio
        </Link>
        <Link
          href="/buscar"
          className="rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-tile"
        >
          Buscar productos
        </Link>
      </div>
    </div>
  );
}
