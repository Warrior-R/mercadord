import { PROVINCES } from "@/lib/provinces";
import type { BrowseParams } from "@/lib/browse-url";

/**
 * Selector de provincia para la pestaña "Cerca de mí". Es un form GET nativo
 * (funciona sin JS) que conserva el resto de filtros como campos ocultos.
 */
export function ProvincePicker({
  basePath,
  params,
  value,
}: {
  basePath: string;
  params: BrowseParams;
  value?: string;
}) {
  const hidden = Object.entries(params).filter(
    ([k, v]) => v && k !== "loc" && k !== "page",
  );

  return (
    <form
      method="get"
      action={basePath}
      className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4"
    >
      {hidden.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="font-semibold text-ink">Tu provincia</span>
        <select
          name="loc"
          defaultValue={value ?? ""}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
        >
          <option value="">Selecciona una provincia…</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-light"
      >
        Ver anuncios cerca
      </button>
    </form>
  );
}
