import { describe, it, expect } from "vitest";
import { validateReviewInput } from "@/lib/review-validation";

describe("validateReviewInput", () => {
  it("acepta una calificación válida sin comentario", () => {
    expect(validateReviewInput({ rating: 4 })).toEqual([]);
  });

  it("acepta calificación con comentario", () => {
    expect(validateReviewInput({ rating: 5, comment: "Buen trato" })).toEqual([]);
  });

  it("rechaza calificación fuera de 1..5", () => {
    expect(validateReviewInput({ rating: 0 }).length).toBeGreaterThan(0);
    expect(validateReviewInput({ rating: 6 }).length).toBeGreaterThan(0);
  });

  it("rechaza calificación no entera", () => {
    expect(validateReviewInput({ rating: 3.5 }).length).toBeGreaterThan(0);
  });

  it("rechaza comentarios demasiado largos", () => {
    expect(
      validateReviewInput({ rating: 3, comment: "x".repeat(1001) }).length,
    ).toBeGreaterThan(0);
  });
});
