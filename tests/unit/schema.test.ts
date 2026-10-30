import { describe, expect, it } from "vitest";
import { leadApiSchema, leadFormSchema, step2Schema } from "@/lib/schema";
import { buildLeadRecord } from "@/lib/lead";
import { mapToCrm } from "../../config/crm-map";

export const validLead = {
  customer_type: "company",
  fleet_size: "20-49",
  vehicle_types: ["van"],
  monthly_fuel_spend: "50k-200k",
  current_method: "cash",
  governorate: "cairo",
  company_name: "شركة النيل للتوزيع",
  job_role: "owner",
  industry: "",
  full_name: "أحمد حسن",
  mobile: "٠١٠١٢٣٤٥٦٧٨",
  whatsapp_same: true,
  email: "",
  preferred_contact: "",
  consent_processing: true,
  consent_marketing: false,
};

describe("lead schema", () => {
  it("accepts a valid Arabic lead with Arabic-Indic mobile", () => {
    expect(leadFormSchema.safeParse(validLead).success).toBe(true);
  });
  it("returns i18n error keys", () => {
    const r = leadFormSchema.safeParse({ ...validLead, mobile: "0225551234", consent_processing: false, email: "bad" });
    expect(r.success).toBe(false);
    const msgs = Object.fromEntries(r.error!.issues.map((i) => [i.path.join("."), i.message]));
    expect(msgs.mobile).toBe("mobile_invalid");
    expect(msgs.consent_processing).toBe("consent_required");
    expect(msgs.email).toBe("email_invalid");
  });
  it("rejects personal use with company_only", () => {
    const r = leadFormSchema.safeParse({ ...validLead, customer_type: "personal" });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe("company_only");
  });
  it("requires a WhatsApp number when different from mobile", () => {
    const r = leadFormSchema.safeParse({ ...validLead, whatsapp_same: false, whatsapp_number: "" });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].path).toEqual(["whatsapp_number"]);
  });
  it("step schema reports 'required' for missing chips", () => {
    const r = step2Schema.safeParse({});
    expect(r.success).toBe(false);
    expect(new Set(r.error!.issues.map((i) => i.message))).toEqual(new Set(["required"]));
  });
});

describe("buildLeadRecord", () => {
  it("normalises, scores and maps to CRM fields", () => {
    const payload = leadApiSchema.parse({
      lead: validLead,
      meta: {
        event_id: "11111111-1111-4111-8111-111111111111",
        started_at: Date.now() - 10_000,
        page_locale: "ar",
        ab_variant: "A",
        lead_intent: "calculator",
        last_touch: { utm_source: "facebook", utm_campaign: "eg_fleet", fbclid: "abc", ts: 1 },
        first_touch: { utm_source: "google", gclid: "g1", ts: 0 },
        calculator_payload: { vehicles: 30, est_spend: 100000 },
      },
    });
    const r = buildLeadRecord(payload, { leadId: "lead-1", submittedAt: new Date(0) });
    expect(r.mobile).toBe("+201012345678");
    expect(r.whatsapp_number).toBe("+201012345678");
    expect(r.lead_tier).toBe("A");
    expect(r.first_name).toBe("أحمد");
    expect(r.utm_source).toBe("facebook");
    expect(r.gclid).toBe("g1"); // falls back to first touch
    expect(r.value).toBe(35 * 40);
    const crm = mapToCrm(r);
    expect(crm.mobilephone).toBe("+201012345678");
    expect(crm.lead_tier).toBe("A");
    expect(typeof crm.calculator_payload).toBe("string");
    expect(crm).not.toHaveProperty("value");
  });
});
