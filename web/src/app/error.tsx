"use client";

/** Límite de error global: captura fallos de render en cualquier ruta. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-20 text-center">
      <p className="text-5xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="mt-4 text-xl font-bold text-ink">Algo salió mal</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Ocurrió un error al cargar esta página. Puedes reintentar.
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-ink-soft/70">Ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-light"
      >
        Reintentar
      </button>
    </div>
  );
}
