import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { site } from "../../../../../config/site";
import { sendCapi } from "@/lib/integrations/meta-capi";
import { hashOrUndefined, normalize } from "@/lib/hash";
import { normalizeEgMobile } from "@/lib/phone";

export const runtime = "nodejs";

/**
 * Offline feedback loop. Point your CRM's "deal stage changed" webhook here
 * (header `x-webhook-secret: $CRM_STAGE_WEBHOOK_SECRET`).
 *
 * Meta: sent now via CAPI (action_source=system_generated).
 * Google Ads: returns the enhanced-conversions-for-leads row; upload it
 * through the Data Manager API (OAuth service account — see README).
 */
const STAGE_TO_EVENT = {
  appointment: "Schedule",
  qualified: "QualifiedLead",
  won: "Purchase",
} as const;

const schema = z.object({
  lead_id: z.string().min(1),
  event_id: z.string().optional(), // original lead event_id (not reused — new event per stage)
  stage: z.enum(["appointment", "qualified", "won"]),
  mobile: z.string().optional(),
  email: z.string().email().optional(),
  gclid: z.string().optional(),
  vehicles: z.number().int().nonnegative().optional(),
  monthly_fee_per_vehicle: z.number().nonnegative().optional(),
  occurred_at: z.string().datetime().optional(),
});

function authorized(req: NextRequest) {
  const expected = process.env.CRM_STAGE_WEBHOOK_SECRET;
  const given = req.headers.get("x-webhook-secret") ?? "";
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, issues: parsed.error.issues }, { status: 400 });
  const s = parsed.data;

  const phone = s.mobile ? normalizeEgMobile(s.mobile) ?? undefined : undefined;
  const fee = s.monthly_fee_per_vehicle ?? site.pricing.avgMonthlyFeePerVehicle;
  const value = s.vehicles ? s.vehicles * fee : undefined;
  const eventTime = s.occurred_at ? Math.floor(Date.parse(s.occurred_at) / 1000) : undefined;

  const meta = await sendCapi([
    {
      event_name: STAGE_TO_EVENT[s.stage],
      event_id: `${s.lead_id}:${s.stage}`,
      event_time: eventTime,
      action_source: "system_generated",
      user: { phoneE164: phone, email: s.email, externalId: s.lead_id, country: "eg" },
      custom_data: { currency: "EGP", ...(value ? { value } : {}), vehicles: s.vehicles, lead_stage: s.stage },
    },
  ]);

  // Row for Google Ads Data Manager API (enhanced conversions for leads).
  const googleRow = {
    conversion_action: process.env[`GOOGLE_ADS_CONVERSION_${s.stage.toUpperCase()}`] ?? null,
    gclid: s.gclid ?? null,
    conversion_date_time: s.occurred_at ?? new Date().toISOString(),
    conversion_value: value ?? null,
    currency_code: "EGP",
    user_identifiers: [
      phone ? { hashed_phone_number: hashOrUndefined(phone, (p) => `+${normalize.phone(p)}`) } : null,
      s.email ? { hashed_email: hashOrUndefined(s.email, normalize.email) } : null,
    ].filter(Boolean),
  };

  return NextResponse.json({ ok: true, meta, google_row: googleRow });
}
