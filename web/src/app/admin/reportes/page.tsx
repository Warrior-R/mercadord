import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin, listReports } from "@/lib/moderation";
import { setReportStatus, removeReportedProduct } from "@/lib/moderation-actions";
import { REPORT_TYPE_LABELS, type ReportType } from "@/lib/report-validation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderación",
  robots: { index: false, follow: false },
};

const STATUS_STYLES: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  revisando: "bg-blue-100 text-blue-800",
  resuelto: "bg-green-100 text-green-800",
  descartado: "bg-neutral-200 text-neutral-600",
};

function productIdFromTarget(target: string): string | null {
  const m = target.match(/^producto:(.+)$/);
  return m ? m[1] : null;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;

  if (!(await isAdmin())) {
    redirect("/entrar?next=/admin/reportes");
  }

  const reports = await listReports();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        Moderación · Reportes
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {reports.length} reporte{reports.length === 1 ? "" : "s"} en total.
      </p>

      {m === "ok" && (
        <p className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          Estado actualizado.
        </p>
      )}
      {m === "removed" && (
        <p className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          Anuncio retirado.
        </p>
      )}
      {m === "error" && (
        <p className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Ocurrió un error. Inténtalo de nuevo.
        </p>
      )}

      {reports.length === 0 ? (
        <p className="mt-8 text-sm text-ink-soft">No hay reportes por ahora.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reports.map((r) => {
            const pid = productIdFromTarget(r.target);
            return (
              <li
                key={r.id}
                className="rounded-xl border border-line bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status] ?? "bg-neutral-200 text-neutral-600"}`}
                  >
                    {r.status}
                  </span>
                  <span className="rounded-full bg-tile px-2 py-0.5 text-xs font-medium text-ink-soft">
                    {REPORT_TYPE_LABELS[r.report_type as ReportType] ??
                      r.report_type}
                  </span>
                  <span className="text-xs text-ink-soft">{r.target}</span>
                </div>

                <p className="mt-2 whitespace-pre-line text-sm text-ink">
                  {r.description}
                </p>
                {r.reporter_email && (
                  <p className="mt-1 text-xs text-ink-soft">
                    Reportado por {r.reporter_email}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(["revisando", "resuelto", "descartado"] as const).map(
                    (s) => (
                      <form action={setReportStatus} key={s}>
                        <input type="hidden" name="report_id" value={r.id} />
                        <input type="hidden" name="status" value={s} />
                        <button
                          type="submit"
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-primary hover:text-primary"
                        >
                          Marcar {s}
                        </button>
                      </form>
                    ),
                  )}
                  {pid && (
                    <form action={removeReportedProduct}>
                      <input type="hidden" name="product_id" value={pid} />
                      <button
                        type="submit"
                        className="rounded-lg border border-accent px-3 py-1.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-white"
                      >
                        Retirar anuncio
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
