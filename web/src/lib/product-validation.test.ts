import { describe, it, expect } from "vitest";
import { validateProductInput } from "@/lib/product-validation";

const ok = {
  title: "iPhone 13",
  price: 28500,
  category: "electronics",
  condition: "used",
  image_url: null,
};

describe("validateProductInput", () => {
  it("no da errores con una entrada válida", () => {
    expect(validateProductInput(ok)).toEqual([]);
  });

  it("rechaza título corto", () => {
    expect(validateProductInput({ ...ok, title: "ab" })).toContain(
      "El título es muy corto.",
    );
  });

  it("rechaza precio <= 0 o no numérico", () => {
    expect(validateProductInput({ ...ok, price: 0 })).toContain(
      "El precio debe ser mayor que 0.",
    );
    expect(validateProductInput({ ...ok, price: NaN })).toContain(
      "El precio debe ser mayor que 0.",
    );
  });

  it("rechaza categoría o condición inválidas", () => {
    expect(validateProductInput({ ...ok, category: "x" })).toContain(
      "Selecciona una categoría válida.",
    );
    expect(validateProductInput({ ...ok, condition: "x" })).toContain(
      "Selecciona una condición válida.",
    );
  });

  it("exige que la imagen sea https si se provee", () => {
    expect(validateProductInput({ ...ok, image_url: "http://x/y.jpg" })).toContain(
      "La imagen debe ser una URL https.",
    );
    expect(validateProductInput({ ...ok, image_url: "https://x/y.jpg" })).toEqual(
      [],
    );
  });

  it("acepta WhatsApp opcional pero exige 10+ dígitos", () => {
    expect(validateProductInput({ ...ok, whatsapp: null })).toEqual([]);
    expect(validateProductInput({ ...ok, whatsapp: "809 555 1234" })).toEqual([]);
    expect(validateProductInput({ ...ok, whatsapp: "123" })).toContain(
      "El WhatsApp debe tener al menos 10 dígitos.",
    );
  });
});
