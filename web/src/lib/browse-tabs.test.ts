import { describe, it, expect } from "vitest";
import {
  BROWSE_TABS,
  parseTab,
  tabWantsDeals,
  tabWantsLocation,
} from "@/lib/browse-tabs";
import { PROVINCES, isKnownProvince } from "@/lib/provinces";

describe("parseTab", () => {
  it("por defecto es destacados", () => {
    expect(parseTab(undefined)).toBe("destacados");
    expect(parseTab("")).toBe("destacados");
    expect(parseTab("inventada")).toBe("destacados");
  });
  it("acepta las pestañas definidas", () => {
    for (const t of BROWSE_TABS) {
      expect(parseTab(t.key)).toBe(t.key);
    }
  });
  it("toma el primer valor de un array", () => {
    expect(parseTab(["ofertas", "nuevos"])).toBe("ofertas");
  });
});

describe("criterios por pestaña", () => {
  it("solo 'ofertas' filtra rebajados", () => {
    expect(tabWantsDeals("ofertas")).toBe(true);
    expect(tabWantsDeals("destacados")).toBe(false);
    expect(tabWantsDeals("nuevos")).toBe(false);
  });
  it("solo 'cerca' pide provincia", () => {
    expect(tabWantsLocation("cerca")).toBe(true);
    expect(tabWantsLocation("ofertas")).toBe(false);
  });
});

describe("provincias", () => {
  it("son las 32 de República Dominicana, sin repetidos", () => {
    expect(PROVINCES).toHaveLength(32);
    expect(new Set(PROVINCES).size).toBe(32);
  });
  it("reconoce provincias válidas sin importar mayúsculas ni espacios", () => {
    expect(isKnownProvince("Santiago")).toBe(true);
    expect(isKnownProvince("  santo domingo ")).toBe(true);
    expect(isKnownProvince("Miami")).toBe(false);
    expect(isKnownProvince(null)).toBe(false);
  });
});
