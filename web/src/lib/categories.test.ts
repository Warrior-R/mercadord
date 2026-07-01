import { describe, it, expect } from "vitest";
import {
  CATEGORIES,
  categoryBySlug,
  categoryByKey,
} from "@/lib/categories";

describe("categories", () => {
  it("todas las categorías tienen key/slug/name/icon únicos", () => {
    const keys = new Set(CATEGORIES.map((c) => c.key));
    const slugs = new Set(CATEGORIES.map((c) => c.slug));
    expect(keys.size).toBe(CATEGORIES.length);
    expect(slugs.size).toBe(CATEGORIES.length);
    for (const c of CATEGORIES) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.icon.length).toBeGreaterThan(0);
    }
  });

  it("categoryBySlug encuentra por slug de URL", () => {
    expect(categoryBySlug("vehiculos")?.key).toBe("vehicles");
    expect(categoryBySlug("electronica")?.key).toBe("electronics");
  });

  it("categoryBySlug devuelve undefined si no existe", () => {
    expect(categoryBySlug("noexiste")).toBeUndefined();
  });

  it("categoryByKey mapea la key de la BD al slug limpio", () => {
    expect(categoryByKey("home2")?.slug).toBe("hogar");
    expect(categoryByKey("agro")?.slug).toBe("agropecuario");
  });

  it("categoryByKey tolera null/undefined/vacío", () => {
    expect(categoryByKey(null)).toBeUndefined();
    expect(categoryByKey(undefined)).toBeUndefined();
    expect(categoryByKey("")).toBeUndefined();
  });
});
