import { CATEGORIES } from "@/lib/categories";
import { CONDITIONS, type SearchFilters } from "@/lib/filters";

/**
 * Panel de filtros. Es un <form> GET nativo a /buscar (funciona sin JS).
 * Se reusa en el sidebar de escritorio y dentro del drawer móvil.
 * Evita ids/for para no colisionar cuando se renderiza dos veces.
 */
export function FilterPanel({ filters }: { filters: SearchFilters }) {
  return (
    <form
      method="get"
      action="/buscar"
      className="flex flex-col gap-5 text-sm"
      aria-label="Filtros de búsqueda"
    >
      {/* Preserva el término de búsqueda y el orden al aplicar filtros */}
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.sort !== "recent" && (
        <input type="hidden" name="sort" value={filters.sort} />
      )}

      <fieldset className="flex flex-col gap-1">
        <label className="font-medium text-neutral-700 dark:text-neutral-300">
          Categoría
        </label>
        <select
          name="cat"
          defaultValue={filters.category ?? ""}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">Todas</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium text-neutral-700 dark:text-neutral-300">
          Condición
        </legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="cond"
            value=""
            defaultChecked={!filters.condition}
          />
          Cualquiera
        </label>
        {CONDITIONS.map((c) => (
          <label key={c.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="cond"
              value={c.value}
              defaultChecked={filters.condition === c.value}
            />
            {c.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="font-medium text-neutral-700 dark:text-neutral-300">
          Precio (RD$)
        </legend>
        <div className="flex items-center gap-2">
          <label className="sr-only">Precio mínimo</label>
          <input
            type="number"
            name="min"
            min={0}
            inputMode="numeric"
            placeholder="Mín."
            defaultValue={filters.minPrice ?? ""}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <span aria-hidden>—</span>
          <label className="sr-only">Precio máximo</label>
          <input
            type="number"
            name="max"
            min={0}
            inputMode="numeric"
            placeholder="Máx."
            defaultValue={filters.maxPrice ?? ""}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <label className="font-medium text-neutral-700 dark:text-neutral-300">
          Ubicación
        </label>
        <input
          type="text"
          name="loc"
          placeholder="Provincia o ciudad"
          defaultValue={filters.location ?? ""}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </fieldset>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
        >
          Aplicar filtros
        </button>
        <a
          href="/buscar"
          className="text-center text-neutral-500 underline hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          Limpiar
        </a>
      </div>
    </form>
  );
}
