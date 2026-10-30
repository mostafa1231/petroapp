import { site, type FuelType } from "../../config/site";

export interface CalcInput {
  vehicles: number;
  fuelType: FuelType;
  litresPerVehicle: number;
  wastePct: number;
  /** Override for editable price input; defaults to config. */
  pricePerLitre?: number;
}

export interface CalcResult {
  pricePerLitre: number;
  monthlySpend: number;
  yearlySpend: number;
  monthlySaving: number;
  yearlySaving: number;
  /** Same spend at the conservative Egyptian-client reference (20%). */
  referenceYearlySaving: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function calculateSavings(input: CalcInput): CalcResult {
  const vehicles = clamp(Math.round(input.vehicles || 0), 0, 100_000);
  const litres = clamp(input.litresPerVehicle || 0, 0, 20_000);
  const waste = clamp(input.wastePct, site.calculator.waste.min, site.calculator.waste.max) / 100;
  const price = input.pricePerLitre && input.pricePerLitre > 0 ? input.pricePerLitre : site.fuelPrices.prices[input.fuelType];

  const monthlySpend = vehicles * litres * price;
  const yearlySpend = monthlySpend * 12;
  const monthlySaving = monthlySpend * waste;
  return {
    pricePerLitre: price,
    monthlySpend: Math.round(monthlySpend),
    yearlySpend: Math.round(yearlySpend),
    monthlySaving: Math.round(monthlySaving),
    yearlySaving: Math.round(monthlySaving * 12),
    referenceYearlySaving: Math.round(yearlySpend * (site.claims.egyptSavingPct / 100)),
  };
}
