import type { FleetSize, JobRole, SpendBand } from "./options";

export type LeadTier = "A" | "B" | "C";

const LARGE_FLEETS: FleetSize[] = ["20-49", "50-99", "100-249", "250+"];
const DECISION_ROLES: JobRole[] = ["owner", "fleet_manager", "finance"];
const MIN_SPEND: SpendBand[] = ["50k-200k", "200k-1m", "gt1m"];

/** Call-back SLA in minutes per tier (C goes to WhatsApp nurture). */
export const TIER_SLA_MINUTES: Record<LeadTier, number | null> = { A: 5, B: 15, C: null };

export interface ScoreInput {
  fleet_size: FleetSize;
  job_role: JobRole;
  monthly_fuel_spend: SpendBand;
}

/**
 * A (hot): fleet ≥ 20 AND decision role AND spend ≥ 50k EGP/month.
 * B: fleet 5–19, or fleet ≥ 20 that misses a role/spend condition.
 * C: fleet 1–4.
 * Every tier is accepted; tier only drives routing and SLA.
 */
export function scoreLead(input: ScoreInput): { tier: LeadTier; reason: string } {
  const { fleet_size, job_role, monthly_fuel_spend } = input;
  if (fleet_size === "1-4") return { tier: "C", reason: "fleet_1_4" };
  if (fleet_size === "5-19") return { tier: "B", reason: "fleet_5_19" };

  const large = LARGE_FLEETS.includes(fleet_size);
  const role = DECISION_ROLES.includes(job_role);
  const spend = MIN_SPEND.includes(monthly_fuel_spend);
  if (large && role && spend) return { tier: "A", reason: "fleet_20plus_decision_role_spend_50k" };
  if (!role) return { tier: "B", reason: "fleet_20plus_non_decision_role" };
  return { tier: "B", reason: "fleet_20plus_low_spend" };
}
