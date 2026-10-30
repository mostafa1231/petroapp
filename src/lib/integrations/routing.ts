import { mapToCrm } from "../../../config/crm-map";
import { formatEgMobileNational } from "../phone";
import { postJson, skipped, type IntegrationResult } from "./http";

export type LeadRecord = Record<string, unknown> & {
  lead_id: string;
  event_id: string;
  lead_tier: "A" | "B" | "C";
  full_name: string;
  first_name: string;
  mobile: string;
  company_name: string;
  fleet_size: string;
  monthly_fuel_spend: string;
  job_role: string;
  governorate: string;
  page_locale: "ar" | "en";
};

/** CRM webhook (Zapier/Make/HubSpot workflow/Zoho Flow/custom). Idempotency key = event_id. */
export async function sendToCrm(lead: LeadRecord): Promise<IntegrationResult> {
  const url = process.env.CRM_WEBHOOK_URL;
  if (!url) return skipped("crm");
  const headers: Record<string, string> = {};
  if (process.env.CRM_API_KEY) headers.authorization = `Bearer ${process.env.CRM_API_KEY}`;
  const res = await postJson(url, mapToCrm(lead), { headers, retries: 3, idempotencyKey: lead.event_id });
  return { name: "crm", status: res.ok ? "ok" : "failed", detail: res.ok ? undefined : `${res.status} ${res.text.slice(0, 200)}` };
}

/** Backup row: Google Sheets via Apps Script web app (see README) or any JSON sink. */
export async function sendBackup(lead: LeadRecord, status: string): Promise<IntegrationResult> {
  const url = process.env.BACKUP_WEBHOOK_URL;
  if (!url) {
    // Always leave a trace in server logs when no sink is configured.
    console.info("[lead:backup]", JSON.stringify({ status, ...lead }));
    return skipped("backup", "logged to stdout");
  }
  const headers: Record<string, string> = {};
  if (process.env.BACKUP_WEBHOOK_SECRET) headers["x-webhook-secret"] = process.env.BACKUP_WEBHOOK_SECRET;
  const res = await postJson(url, { status, ...flatten(lead) }, { headers, retries: 3 });
  return { name: "backup", status: res.ok ? "ok" : "failed" };
}

function flatten(o: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "object" && v !== null ? JSON.stringify(v) : v]));
}

function alertText(lead: LeadRecord) {
  const sla = lead.lead_tier === "A" ? "⏱ call within 5 min" : lead.lead_tier === "B" ? "⏱ call within 15 min" : "💬 WhatsApp nurture";
  const calc = lead.calculator_payload as { est_spend?: number; est_saving?: number } | undefined;
  return [
    `🔥 New PetroApp EG lead — Tier ${lead.lead_tier} (${sla})`,
    `${lead.full_name} · ${lead.company_name} · ${lead.job_role}`,
    `Fleet: ${lead.fleet_size} · Spend: ${lead.monthly_fuel_spend} · ${lead.governorate}`,
    `📞 ${formatEgMobileNational(lead.mobile)} → tel:${lead.mobile}`,
    `WhatsApp: https://wa.me/${String(lead.whatsapp_number || lead.mobile).replace("+", "")}`,
    calc?.est_spend ? `Calculator: spend ${calc.est_spend} EGP/mo, saving ${calc.est_saving} EGP/yr` : "",
    `Source: ${lead.utm_source || "direct"} / ${lead.utm_campaign || "-"} · intent ${lead.lead_intent} · variant ${lead.ab_variant}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendSlackAlert(lead: LeadRecord): Promise<IntegrationResult> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return skipped("slack");
  const res = await postJson(url, { text: alertText(lead) }, { retries: 2 });
  return { name: "slack", status: res.ok ? "ok" : "failed" };
}

/** Email alert via Resend (https://resend.com) — swap for any transactional API. */
export async function sendEmailAlert(lead: LeadRecord): Promise<IntegrationResult> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.SALES_ALERT_EMAILS;
  if (!key || !to) return skipped("email");
  const res = await postJson(
    "https://api.resend.com/emails",
    {
      from: process.env.ALERT_FROM_EMAIL ?? "PetroApp Leads <leads@petroapp.com>",
      to: to.split(",").map((s) => s.trim()),
      subject: `[Tier ${lead.lead_tier}] ${lead.company_name} — ${lead.fleet_size} vehicles`,
      text: alertText(lead),
    },
    { headers: { authorization: `Bearer ${key}` }, retries: 2 },
  );
  return { name: "email", status: res.ok ? "ok" : "failed" };
}

/**
 * Optional WhatsApp Cloud API template message to the lead within 60 s.
 * Requires an approved template with one body variable ({{1}} = first name)
 * and is only sent when the lead's mobile is on WhatsApp.
 */
export async function sendWhatsappTemplate(lead: LeadRecord): Promise<IntegrationResult> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!token || !phoneId || !template) return skipped("whatsapp_template");
  const to = String(lead.whatsapp_number || lead.mobile).replace("+", "");
  const res = await postJson(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: lead.page_locale === "ar" ? "ar" : "en" },
        components: [{ type: "body", parameters: [{ type: "text", text: lead.first_name }] }],
      },
    },
    { headers: { authorization: `Bearer ${token}` }, retries: 1 },
  );
  return { name: "whatsapp_template", status: res.ok ? "ok" : "failed" };
}

/** Dead-letter alert when the CRM push fails after retries. */
export async function alertFailure(lead: LeadRecord, detail: string) {
  console.error("[lead:crm_failed]", lead.lead_id, detail);
  const url = process.env.SLACK_WEBHOOK_URL;
  if (url) await postJson(url, { text: `⚠️ CRM push failed for lead ${lead.lead_id} (${lead.company_name}). Backup row written. ${detail}` });
}
