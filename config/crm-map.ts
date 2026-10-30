/**
 * Internal lead field → CRM field name. Edit the right-hand side to match
 * your CRM (HubSpot internal names, Zoho API names, Salesforce API fields…).
 * Fields mapped to null are not sent.
 */
export const crmFieldMap: Record<string, string | null> = {
  lead_id: "external_lead_id",
  event_id: "event_id",
  lead_tier: "lead_tier",
  lead_score_reason: "lead_tier_reason",
  full_name: "full_name",
  first_name: "firstname",
  mobile: "mobilephone",
  whatsapp_number: "whatsapp_number",
  email: "email",
  company_name: "company",
  job_role: "jobtitle_category",
  industry: "industry",
  fleet_size: "fleet_size",
  vehicle_types: "vehicle_types",
  monthly_fuel_spend: "monthly_fuel_spend",
  current_method: "current_fuel_method",
  governorate: "governorate",
  preferred_contact: "preferred_contact",
  consent_processing: "consent_processing",
  consent_marketing: "consent_marketing",
  consent_state: "cookie_consent_state",
  lead_intent: "lead_intent",
  calculator_payload: "calculator_payload",
  page_locale: "page_locale",
  ab_variant: "ab_variant",
  device_type: "device_type",
  landing_page_url: "landing_page_url",
  referrer: "referrer",
  utm_source: "utm_source",
  utm_medium: "utm_medium",
  utm_campaign: "utm_campaign",
  utm_content: "utm_content",
  utm_term: "utm_term",
  utm_id: "utm_id",
  first_touch: "first_touch_json",
  gclid: "gclid",
  gbraid: "gbraid",
  wbraid: "wbraid",
  fbclid: "fbclid",
  fbc: "fbc",
  fbp: "fbp",
  ttclid: "ttclid",
  li_fat_id: "li_fat_id",
  client_id: "ga_client_id",
  submitted_at: "submitted_at",
  first_touch_ts: "first_touch_ts",
  last_touch_ts: "last_touch_ts",
  sla_minutes: "sla_minutes",
  lead_source: "lead_source",
};

export function mapToCrm(lead: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(lead)) {
    const target = crmFieldMap[k];
    if (target && v !== undefined && v !== "") {
      out[target] = typeof v === "object" && v !== null ? JSON.stringify(v) : v;
    }
  }
  return out;
}
