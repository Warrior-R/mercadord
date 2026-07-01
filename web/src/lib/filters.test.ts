import { describe, it, expect } from "vitest";
import { parseFilters, conditionLabel, hasActiveFilters } from "@/lib/filters";

describe("parseFilters", () => {
  it("por defecto: sin filtros, orden 'recent'", () => {
    const f = parseFilters({});
    expect(f).toEqual({
      q: undefined,
      category: undefined,
      condition: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      location: undefined,
      sort: "recent",
    });
  });

  it("lee q, categoría, ubicación y recorta espacios", () => {
    const f = parseFilters({ q: "  iphone ", cat: "electronics", loc: " Santiago " });
    expect(f.q).toBe("iphone");
    expect(f.category).toBe("electronics");
    expect(f.location).toBe("Santiago");
  });

  it("acepta solo condiciones válidas", () => {
    expect(parseFilters({ cond: "used" }).condition).toBe("used");
    expect(parseFilters({ cond: "inventada" }).condition).toBeUndefined();
  });

  it("ignora precios no positivos o no numéricos", () => {
    expect(parseFilters({ min: "1000", max: "0" })).toMatchObject({
      minPrice: 1000,
      maxPrice: undefined,
    });
    expect(parseFilters({ min: "abc" }).minPrice).toBeUndefined();
  });

  it("solo acepta claves de orden conocidas", () => {
    expect(parseFilters({ sort: "price_asc" }).sort).toBe("price_asc");
    expect(parseFilters({ sort: "hack" }).sort).toBe("recent");
  });

  it("toma el primer valor si el param llega repetido", () => {
    expect(parseFilters({ q: ["uno", "dos"] }).q).toBe("uno");
  });
});

describe("conditionLabel", () => {
  it("mapea clave → etiqueta en español", () => {
    expect(conditionLabel("new")).toBe("Nuevo");
    expect(conditionLabel("used")).toBe("Usado");
    expect(conditionLabel("refurb")).toBe("Reacondicionado");
  });
  it("devuelve el valor crudo si no la conoce, o '' si es null", () => {
    expect(conditionLabel("otra")).toBe("otra");
    expect(conditionLabel(null)).toBe("");
  });
});

describe("hasActiveFilters", () => {
  it("false cuando solo hay orden por defecto", () => {
    expect(hasActiveFilters(parseFilters({}))).toBe(false);
  });
  it("true cuando hay al menos un filtro", () => {
    expect(hasActiveFilters(parseFilters({ cat: "moda" }))).toBe(true);
    expect(hasActiveFilters(parseFilters({ q: "silla" }))).toBe(true);
  });
});
