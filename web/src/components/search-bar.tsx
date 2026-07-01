/** Barra de búsqueda: form GET nativo a /buscar (funciona sin JS). */
export function SearchBar({
  defaultValue = "",
  hidden = {},
}: {
  defaultValue?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form method="get" action="/buscar" role="search" className="flex w-full">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Buscar productos, marcas y más…"
        aria-label="Buscar productos"
        className="min-w-0 flex-1 rounded-l-md border-0 bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent2"
      />
      <button
        type="submit"
        className="shrink-0 rounded-r-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
      >
        Buscar
      </button>
    </form>
  );
}
