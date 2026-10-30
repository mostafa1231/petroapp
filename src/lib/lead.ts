import { site } from "../../config/site";
import { FLEET_MIDPOINT } from "./options";
import { normalizeEgMobile } from "./phone";
import type { LeadApiPayload } from "./schema";
import { scoreLead, TIER_SLA_MINUTES } from "./scoring";
import type { LeadRecord } from "./integrations/routing";

/** Turns a validated API payload into the flat record sent to CRM/backup/alerts. */
export function buildLeadRecord(
  payload: LeadApiPayload,
  ctx: { leadId: string; submittedAt: Date },
): LeadRecord & { value: number } {
  const { lead, meta } = payload;
  const mobile = normalizeEgMobile(lead.mobile)!;
  const whatsapp = lead.whatsapp_same ? mobile : normalizeEgMobile(lead.whatsapp_number ?? "") ?? mobile;
  const { tier, reason } = scoreLead(lead);
  const fullName = lead.full_name.trim().replace(/\s+/g, " ");
  const last = meta.last_touch ?? {};
  const first = meta.first_touch ?? {};
  const value = FLEET_MIDPOINT[lead.fleet_size] * site.pricing.avgMonthlyFeePerVehicle;

  return {
    lead_id: ctx.leadId,
    event_id: meta.event_id,
    lead_tier: tier,
    lead_score_reason: reason,
    sla_minutes: TIER_SLA_MINUTES[tier] ?? "",
    lead_source: "landing_page",
    value,

    full_name: fullName,
    first_name: fullName.split(" ")[0],
    mobile,
    whatsapp_number: whatsapp,
    email: lead.email || "",
    company_name: lead.company_name.trim(),
    job_role: lead.job_role,
    industry: lead.industry || "",
    fleet_size: lead.fleet_size,
    vehicle_types: (lead.vehicle_types ?? []).join(","),
    monthly_fuel_spend: lead.monthly_fuel_spend,
    current_method: lead.current_method,
    governorate: lead.governorate,
    preferred_contact: lead.preferred_contact || "",
    consent_processing: lead.consent_processing,
    consent_marketing: !!lead.consent_marketing,
    consent_state: meta.consent_state ?? "",

    lead_intent: meta.lead_intent,
    calculator_payload: meta.calculator_payload ?? "",
    page_locale: meta.page_locale,
    ab_variant: meta.ab_variant ?? "",
    device_type: meta.device_type ?? "",
    landing_page_url: meta.landing_page_url || last.landing_page_url || "",
    referrer: meta.referrer || first.referrer || "",

    // Last-touch campaign params on the record; first touch kept as JSON.
    utm_source: last.utm_source ?? "",
    utm_medium: last.utm_medium ?? "",
    utm_campaign: last.utm_campaign ?? "",
    utm_content: last.utm_content ?? "",
    utm_term: last.utm_term ?? "",
    utm_id: last.utm_id ?? "",
    gclid: last.gclid ?? first.gclid ?? "",
    gbraid: last.gbraid ?? first.gbraid ?? "",
    wbraid: last.wbraid ?? first.wbraid ?? "",
    fbclid: last.fbclid ?? first.fbclid ?? "",
    ttclid: last.ttclid ?? first.ttclid ?? "",
    li_fat_id: last.li_fat_id ?? first.li_fat_id ?? "",
    fbc: meta.fbc ?? "",
    fbp: meta.fbp ?? "",
    first_touch: meta.first_touch ?? "",
    first_touch_ts: first.ts ? new Date(first.ts).toISOString() : "",
    last_touch_ts: last.ts ? new Date(last.ts).toISOString() : "",
    client_id: meta.client_id ?? "",
    submitted_at: ctx.submittedAt.toISOString(),
  };
}

/** Server-side consent gate for sending user data to ad platforms. */
export function adUserDataAllowed(consent: LeadApiPayload["meta"]["consent_state"]): boolean {
  if (consent) return consent.ad_user_data === "granted";
  return site.features.consentDefault === "granted";
}
