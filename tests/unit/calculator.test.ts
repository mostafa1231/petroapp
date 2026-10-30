import { describe, expect, it } from "vitest";
import { calculateSavings } from "@/lib/calculator";
import { fleetSizeFromCount, spendBandFromEgp } from "@/lib/options";

describe("calculateSavings", () => {
  it("computes spend and saving from config prices", () => {
    const r = calculateSavings({ vehicles: 20, fuelType: "diesel", litresPerVehicle: 400, wastePct: 15 });
    expect(r.pricePerLitre).toBe(20.5);
    expect(r.monthlySpend).toBe(164_000);
    expect(r.yearlySpend).toBe(1_968_000);
    expect(r.monthlySaving).toBe(24_600);
    expect(r.yearlySaving).toBe(295_200);
    expect(r.referenceYearlySaving).toBe(393_600); // 20%
  });
  it("uses an edited price when given", () => {
    expect(calculateSavings({ vehicles: 1, fuelType: "92", litresPerVehicle: 100, wastePct: 10, pricePerLitre: 25 }).monthlySpend).toBe(2500);
  });
  it("clamps waste to the configured 10–35% range", () => {
    const hi = calculateSavings({ vehicles: 1, fuelType: "95", litresPerVehicle: 100, wastePct: 90 });
    expect(hi.monthlySaving).toBe(Math.round(2400 * 0.35));
    const lo = calculateSavings({ vehicles: 1, fuelType: "95", litresPerVehicle: 100, wastePct: 1 });
    expect(lo.monthlySaving).toBe(240);
  });
  it("handles zero/empty input", () => {
    expect(calculateSavings({ vehicles: 0, fuelType: "80", litresPerVehicle: 0, wastePct: 15 }).yearlySaving).toBe(0);
  });
});

describe("calculator → form mapping", () => {
  it.each([
    [1, "1-4"],
    [4, "1-4"],
    [5, "5-19"],
    [20, "20-49"],
    [99, "50-99"],
    [249, "100-249"],
    [250, "250+"],
  ])("%i vehicles → %s", (n, b) => expect(fleetSizeFromCount(n)).toBe(b));
  it.each([
    [10_000, "lt50k"],
    [50_000, "50k-200k"],
    [199_999, "50k-200k"],
    [200_000, "200k-1m"],
    [1_000_000, "gt1m"],
  ])("%i EGP → %s", (n, b) => expect(spendBandFromEgp(n)).toBe(b));
});
