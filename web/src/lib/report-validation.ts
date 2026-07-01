export const REPORT_TYPES = ["fraude", "spam", "sospechoso", "otro"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  fraude: "Fraude o estafa",
  spam: "Spam o duplicado",
  sospechoso: "Contenido sospechoso o prohibido",
  otro: "Otro motivo",
};

/** Validación pura del reporte (la Server Action solo exporta async). */
export function validateReportInput(input: {
  report_type: string;
  description: string;
}): string[] {
  const errors: string[] = [];
  if (!REPORT_TYPES.includes(input.report_type as ReportType)) {
    errors.push("Elige un motivo válido.");
  }
  const desc = input.description.trim();
  if (desc.length < 5) errors.push("Describe el problema (mínimo 5 caracteres).");
  if (desc.length > 2000) errors.push("La descripción es demasiado larga.");
  return errors;
}
