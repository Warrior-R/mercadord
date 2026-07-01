import { describe, it, expect } from "vitest";
import {
  parsePage,
  rangeFor,
  totalPages,
  pageHref,
} from "@/lib/pagination";

describe("parsePage", () => {
  it("por defecto es 1", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });
  it("lee enteros válidos", () => {
    expect(parsePage("2")).toBe(2);
    expect(parsePage("10")).toBe(10);
    expect(parsePage("3.9")).toBe(3);
  });
  it("toma el primer valor de un array", () => {
    expect(parsePage(["4", "5"])).toBe(4);
  });
});

describe("rangeFor", () => {
  it("página 1 con tamaño 24 → 0..23", () => {
    expect(rangeFor(1, 24)).toEqual({ from: 0, to: 23 });
  });
  it("página 2 con tamaño 24 → 24..47", () => {
    expect(rangeFor(2, 24)).toEqual({ from: 24, to: 47 });
  });
  it("página 3 con tamaño 10 → 20..29", () => {
    expect(rangeFor(3, 10)).toEqual({ from: 20, to: 29 });
  });
  it("saneo de páginas inválidas a la 1", () => {
    expect(rangeFor(0, 24)).toEqual({ from: 0, to: 23 });
  });
});

describe("totalPages", () => {
  it("redondea hacia arriba", () => {
    expect(totalPages(0, 24)).toBe(1);
    expect(totalPages(24, 24)).toBe(1);
    expect(totalPages(25, 24)).toBe(2);
    expect(totalPages(60, 24)).toBe(3);
  });
});

describe("pageHref", () => {
  it("omite page=1", () => {
    expect(pageHref("/buscar", { q: "tv" }, 1)).toBe("/buscar?q=tv");
  });
  it("agrega page>1 preservando params", () => {
    expect(pageHref("/buscar", { q: "tv" }, 2)).toBe("/buscar?q=tv&page=2");
  });
  it("descarta params vacíos", () => {
    expect(pageHref("/", { q: undefined, cat: "" }, 2)).toBe("/?page=2");
  });
  it("sin params ni página devuelve el basePath", () => {
    expect(pageHref("/", {}, 1)).toBe("/");
  });
});
