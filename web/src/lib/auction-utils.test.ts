import { describe, it, expect } from "vitest";
import {
  bidStep,
  minNextBid,
  formatTimeLeft,
  isAuctionLive,
} from "@/lib/auction-utils";

describe("bidStep (espejo de bid_step SQL)", () => {
  it("mínimo RD$500 para precios bajos", () => {
    expect(bidStep(0)).toBe(500);
    expect(bidStep(1000)).toBe(500);
    expect(bidStep(20000)).toBe(500); // 2%=400 → 400 < 500
  });
  it("2% redondeado a centenas cuando supera 500", () => {
    expect(bidStep(50000)).toBe(1000); // 2% = 1000
    expect(bidStep(58000)).toBe(1200); // 2% = 1160 → 1200
    expect(bidStep(650000)).toBe(13000); // 2% = 13000
  });
});

describe("minNextBid", () => {
  it("suma el incremento a la puja actual", () => {
    expect(minNextBid(50000)).toBe(51000);
    expect(minNextBid(58000)).toBe(59200);
  });
});

describe("formatTimeLeft", () => {
  it("finalizada si ya venció", () => {
    expect(formatTimeLeft(0)).toBe("Finalizada");
    expect(formatTimeLeft(-5000)).toBe("Finalizada");
  });
  it("días y horas", () => {
    expect(formatTimeLeft((26 * 3600 + 5) * 1000)).toBe("1d 2h");
  });
  it("horas y minutos", () => {
    expect(formatTimeLeft((3 * 3600 + 12 * 60) * 1000)).toBe("3h 12m");
  });
  it("minutos y segundos con padding", () => {
    expect(formatTimeLeft((12 * 60 + 5) * 1000)).toBe("12m 05s");
  });
  it("solo segundos", () => {
    expect(formatTimeLeft(45 * 1000)).toBe("45s");
  });
});

describe("isAuctionLive", () => {
  it("viva si activa y no ha vencido", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    expect(isAuctionLive("active", future)).toBe(true);
  });
  it("no viva si vencida o no activa", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isAuctionLive("active", past)).toBe(false);
    expect(isAuctionLive("ended", new Date(Date.now() + 1000).toISOString())).toBe(false);
    expect(isAuctionLive("active", null)).toBe(false);
  });
});
