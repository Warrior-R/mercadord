/** Barra de búsqueda: form GET nativo a /buscar (funciona sin JS). */
export function SearchBar({
  defaultValue = "",
  hidden = {},
}: {
  defaultValue?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form
      method="get"
      action="/buscar"
      role="search"
      className="flex w-full items-center gap-2"
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Buscar productos, marcas y más…"
        aria-label="Buscar productos"
        className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Buscar
      </button>
    </form>
  );
}
