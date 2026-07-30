import { describe, it, expect } from "vitest";
import { validateReportInput, REPORT_TYPES } from "@/lib/report-validation";

describe("validateReportInput", () => {
  it("acepta un reporte válido", () => {
    expect(
      validateReportInput({
        report_type: "fraude",
        description: "Pide pago por adelantado y no entrega.",
      }),
    ).toEqual([]);
  });

  it("acepta todos los tipos definidos", () => {
    for (const t of REPORT_TYPES) {
      expect(
        validateReportInput({ report_type: t, description: "motivo válido" }),
      ).toEqual([]);
    }
  });

  it("rechaza tipos desconocidos", () => {
    expect(
      validateReportInput({ report_type: "hack", description: "algo malo aquí" })
        .length,
    ).toBeGreaterThan(0);
  });

  it("rechaza descripciones demasiado cortas", () => {
    expect(
      validateReportInput({ report_type: "spam", description: "no" }).length,
    ).toBeGreaterThan(0);
  });

  it("rechaza descripciones demasiado largas", () => {
    expect(
      validateReportInput({
        report_type: "otro",
        description: "x".repeat(2001),
      }).length,
    ).toBeGreaterThan(0);
  });
});
