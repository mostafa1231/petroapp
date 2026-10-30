/** Option keys for every chip/select. Labels live in messages/*.json under `options.*`. */

export const FLEET_SIZES = ["1-4", "5-19", "20-49", "50-99", "100-249", "250+"] as const;
export type FleetSize = (typeof FLEET_SIZES)[number];

/** Midpoint used for value estimates and calculator → form mapping. */
export const FLEET_MIDPOINT: Record<FleetSize, number> = {
  "1-4": 3,
  "5-19": 12,
  "20-49": 35,
  "50-99": 75,
  "100-249": 175,
  "250+": 300,
};

export function fleetSizeFromCount(n: number): FleetSize {
  if (n <= 4) return "1-4";
  if (n <= 19) return "5-19";
  if (n <= 49) return "20-49";
  if (n <= 99) return "50-99";
  if (n <= 249) return "100-249";
  return "250+";
}

export const VEHICLE_TYPES = ["sedan", "van", "light_truck", "heavy_truck", "bus", "motorcycle"] as const;

export const SPEND_BANDS = ["lt50k", "50k-200k", "200k-1m", "gt1m"] as const;
export type SpendBand = (typeof SPEND_BANDS)[number];

export function spendBandFromEgp(monthly: number): SpendBand {
  if (monthly < 50_000) return "lt50k";
  if (monthly < 200_000) return "50k-200k";
  if (monthly < 1_000_000) return "200k-1m";
  return "gt1m";
}

export const CURRENT_METHODS = ["cash", "coupons", "single_brand_card", "other_system"] as const;

export const JOB_ROLES = ["owner", "fleet_manager", "finance", "procurement", "operations", "other"] as const;
export type JobRole = (typeof JOB_ROLES)[number];

export const INDUSTRIES = [
  "logistics",
  "fmcg",
  "pharma",
  "contracting",
  "transport_tourism",
  "food_delivery",
  "other",
] as const;

export const PREFERRED_CONTACT = ["call", "whatsapp"] as const;

/** 27 governorates; Cairo, Giza, Alexandria first. */
export const GOVERNORATES = [
  "cairo",
  "giza",
  "alexandria",
  "qalyubia",
  "sharqia",
  "dakahlia",
  "gharbia",
  "monufia",
  "beheira",
  "kafr_el_sheikh",
  "damietta",
  "port_said",
  "ismailia",
  "suez",
  "faiyum",
  "beni_suef",
  "minya",
  "asyut",
  "sohag",
  "qena",
  "luxor",
  "aswan",
  "red_sea",
  "new_valley",
  "matrouh",
  "north_sinai",
  "south_sinai",
] as const;

export const LEAD_INTENTS = ["hero", "calculator", "pricing", "exit", "final_cta"] as const;
export type LeadIntent = (typeof LEAD_INTENTS)[number];
