import { submitReport } from "@/lib/report-actions";
import {
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
} from "@/lib/report-validation";
import type { Product } from "@/lib/types";

export function ReportListing({
  product,
  slug,
  status,
}: {
  product: Product;
  slug: string;
  status?: string;
}) {
  return (
    <section aria-label="Reportar anuncio" className="mt-4">
      {status === "ok" && (
        <p className="mb-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          Gracias por avisar. Nuestro equipo revisará este anuncio.
        </p>
      )}
      {status === "invalid" && (
        <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Elige un motivo y describe el problema (mínimo 5 caracteres).
        </p>
      )}
      {status === "error" && (
        <p className="mb-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          No se pudo enviar el reporte. Inténtalo de nuevo.
        </p>
      )}

      <details className="group rounded-xl border border-line bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-ink-soft transition hover:text-accent">
          <span aria-hidden>⚑</span> Reportar este anuncio
        </summary>
        <form
          action={submitReport}
          className="flex flex-col gap-2 border-t border-line px-4 py-3"
        >
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="slug" value={slug} />
          <label className="text-xs font-medium text-ink-soft" htmlFor="rep-type">
            Motivo
          </label>
          <select
            id="rep-type"
            name="report_type"
            required
            defaultValue="fraude"
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
          >
            {REPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {REPORT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            rows={3}
            required
            minLength={5}
            maxLength={2000}
            placeholder="Cuéntanos qué está mal con este anuncio."
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
          />
          <button
            type="submit"
            className="self-start rounded-lg border border-accent px-4 py-2 text-sm font-bold text-accent transition hover:bg-accent hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Enviar reporte
          </button>
        </form>
      </details>
    </section>
  );
}
