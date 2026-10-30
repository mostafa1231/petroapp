import { describe, expect, it } from "vitest";
import { scoreLead } from "@/lib/scoring";

describe("scoreLead", () => {
  it("A: fleet ≥20, decision role, spend ≥50k", () => {
    expect(scoreLead({ fleet_size: "20-49", job_role: "owner", monthly_fuel_spend: "50k-200k" }).tier).toBe("A");
    expect(scoreLead({ fleet_size: "250+", job_role: "finance", monthly_fuel_spend: "gt1m" }).tier).toBe("A");
    expect(scoreLead({ fleet_size: "100-249", job_role: "fleet_manager", monthly_fuel_spend: "200k-1m" }).tier).toBe("A");
  });
  it("B: large fleet but non-decision role", () => {
    expect(scoreLead({ fleet_size: "50-99", job_role: "procurement", monthly_fuel_spend: "gt1m" })).toEqual({
      tier: "B",
      reason: "fleet_20plus_non_decision_role",
    });
  });
  it("B: large fleet but spend under 50k", () => {
    expect(scoreLead({ fleet_size: "20-49", job_role: "owner", monthly_fuel_spend: "lt50k" }).tier).toBe("B");
  });
  it("B: fleet 5–19 regardless of role/spend", () => {
    expect(scoreLead({ fleet_size: "5-19", job_role: "owner", monthly_fuel_spend: "gt1m" }).tier).toBe("B");
  });
  it("C: fleet 1–4", () => {
    expect(scoreLead({ fleet_size: "1-4", job_role: "owner", monthly_fuel_spend: "gt1m" }).tier).toBe("C");
  });
});
