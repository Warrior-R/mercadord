import { CATEGORIES } from "@/lib/categories";

/** Barra de búsqueda: form GET nativo a /buscar (funciona sin JS). */
export function SearchBar({
  defaultValue = "",
  hidden = {},
  showCategory = false,
  defaultCategory = "",
}: {
  defaultValue?: string;
  hidden?: Record<string, string>;
  /** Muestra el selector "Todas las categorías" tipo eBay (solo en el header). */
  showCategory?: boolean;
  defaultCategory?: string;
}) {
  return (
    <form
      method="get"
      action="/buscar"
      role="search"
      className="flex w-full items-stretch overflow-hidden rounded-full border-2 border-primary bg-white"
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {showCategory && (
        <select
          name="cat"
          defaultValue={defaultCategory}
          aria-label="Categoría a buscar"
          className="hidden shrink-0 border-r border-line bg-tile px-3 text-sm text-ink-soft outline-none sm:block"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Buscar productos, marcas y más…"
        aria-label="Buscar productos"
        className="min-w-0 flex-1 bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/70"
      />
      <button
        type="submit"
        className="shrink-0 bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent2"
      >
        Buscar
      </button>
    </form>
  );
}
