import { describe, it, expect } from "vitest";
import { browseHref } from "@/lib/browse-url";

describe("browseHref", () => {
  it("sin parámetros devuelve la ruta base", () => {
    expect(browseHref("/", {})).toBe("/");
  });

  it("conserva los filtros actuales", () => {
    expect(browseHref("/", { cat: "vehicles", cond: "new" })).toBe(
      "/?cat=vehicles&cond=new",
    );
  });

  it("un cambio sobrescribe el valor actual", () => {
    expect(browseHref("/", { cat: "vehicles" }, { cat: "fashion" })).toBe(
      "/?cat=fashion",
    );
  });

  it("un cambio a undefined elimina el parámetro", () => {
    expect(browseHref("/", { cat: "vehicles", cond: "new" }, { cat: undefined })).toBe(
      "/?cond=new",
    );
  });

  it("descarta valores vacíos", () => {
    expect(browseHref("/", { cat: "", loc: undefined, cond: "used" })).toBe(
      "/?cond=used",
    );
  });

  it("siempre vuelve a la página 1", () => {
    expect(browseHref("/", { cat: "moda", page: "5" })).toBe("/?cat=moda");
  });

  it("el orden de los parámetros es estable (alfabético)", () => {
    const a = browseHref("/", { sort: "price_asc", cat: "moda" });
    const b = browseHref("/", { cat: "moda", sort: "price_asc" });
    expect(a).toBe(b);
    expect(a).toBe("/?cat=moda&sort=price_asc");
  });

  it("funciona con otra ruta base", () => {
    expect(browseHref("/buscar", { q: "tv" }, { tab: "ofertas" })).toBe(
      "/buscar?q=tv&tab=ofertas",
    );
  });
});
