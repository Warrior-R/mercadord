import { CATEGORIES } from "@/lib/categories";
import { CONDITIONS, type SearchFilters } from "@/lib/filters";

const fieldClass =
  "rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light";

/**
 * Panel de filtros. Es un <form> GET nativo (funciona sin JS). Se reusa en el
 * sidebar de escritorio y dentro del drawer móvil, en /buscar y en /categoria.
 * - `action`: destino del form (por defecto /buscar).
 * - `lockedCategory`: oculta el selector de categoría (cuando la ruta ya la fija).
 * Evita ids/for para no colisionar cuando se renderiza dos veces.
 */
export function FilterPanel({
  filters,
  action = "/buscar",
  lockedCategory = false,
}: {
  filters: SearchFilters;
  action?: string;
  lockedCategory?: boolean;
}) {
  return (
    <form
      method="get"
      action={action}
      className="flex flex-col gap-5 text-sm"
      aria-label="Filtros de búsqueda"
    >
      {/* Preserva el término de búsqueda y el orden al aplicar filtros */}
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.sort !== "recent" && (
        <input type="hidden" name="sort" value={filters.sort} />
      )}

      {!lockedCategory && (
        <fieldset className="flex flex-col gap-1">
          <label className="font-semibold text-ink">Categoría</label>
          <select
            name="cat"
            defaultValue={filters.category ?? ""}
            className={fieldClass}
          >
            <option value="">Todas</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 font-semibold text-ink">Precio (RD$)</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only">Precio mínimo</label>
          <input
            type="number"
            name="min"
            min={0}
            inputMode="numeric"
            placeholder="Mín."
            defaultValue={filters.minPrice ?? ""}
            className={`w-full ${fieldClass}`}
          />
          <span aria-hidden className="text-ink-soft">
            —
          </span>
          <label className="sr-only">Precio máximo</label>
          <input
            type="number"
            name="max"
            min={0}
            inputMode="numeric"
            placeholder="Máx."
            defaultValue={filters.maxPrice ?? ""}
            className={`w-full ${fieldClass}`}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold text-ink">Condición</legend>
        <label className="flex items-center gap-2 text-ink-soft">
          <input
            type="radio"
            name="cond"
            value=""
            defaultChecked={!filters.condition}
            className="accent-primary"
          />
          Cualquiera
        </label>
        {CONDITIONS.map((c) => (
          <label key={c.value} className="flex items-center gap-2 text-ink-soft">
            <input
              type="radio"
              name="cond"
              value={c.value}
              defaultChecked={filters.condition === c.value}
              className="accent-primary"
            />
            {c.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <label className="font-semibold text-ink">Ubicación</label>
        <input
          type="text"
          name="loc"
          placeholder="Provincia o ciudad"
          defaultValue={filters.location ?? ""}
          className={fieldClass}
        />
      </fieldset>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2.5 font-bold text-white transition hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
        >
          Aplicar filtros
        </button>
        <a
          href={action}
          className="text-center text-ink-soft underline hover:text-primary"
        >
          Limpiar filtros
        </a>
      </div>
    </form>
  );
}
