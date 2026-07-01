import { describe, it, expect } from "vitest";
import { slugify, idFromSlug, productHref, formatPrice } from "@/lib/format";

describe("slugify", () => {
  it("baja a minúsculas y usa guiones", () => {
    expect(slugify("iPhone 13 Pro")).toBe("iphone-13-pro");
  });
  it("quita acentos y ñ", () => {
    expect(slugify("Cámara réflex Nikon")).toBe("camara-reflex-nikon");
  });
  it("colapsa símbolos y recorta guiones extremos", () => {
    expect(slugify("  ¡Oferta!! 50% ")).toBe("oferta-50");
  });
  it("cae a 'producto' si queda vacío", () => {
    expect(slugify("!!!")).toBe("producto");
  });
});

describe("idFromSlug", () => {
  const uuid = "0a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9";
  it("extrae el uuid del final", () => {
    expect(idFromSlug(`iphone-13-${uuid}`)).toBe(uuid);
  });
  it("devuelve null si no hay uuid", () => {
    expect(idFromSlug("iphone-13")).toBeNull();
  });
});

describe("productHref", () => {
  it("arma /producto/<slug>-<id>", () => {
    expect(productHref({ id: "abc", title: "Laptop Lenovo" })).toBe(
      "/producto/laptop-lenovo-abc",
    );
  });
});

describe("formatPrice", () => {
  it("formatea en pesos dominicanos sin decimales", () => {
    const out = formatPrice(28500);
    expect(out).toContain("28,500");
    expect(out).toMatch(/RD\$|DOP/);
  });
});
