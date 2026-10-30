import { after, NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { leadApiSchema } from "@/lib/schema";
import { adUserDataAllowed, buildLeadRecord } from "@/lib/lead";
import { createLeadToken } from "@/lib/token";
import { normalizeEgMobileStrict } from "@/lib/phone-server";
import { clientIp, isDuplicatePhone, rateLimited, verifyTurnstile } from "@/lib/integrations/guard";
import {
  alertFailure,
  sendBackup,
  sendEmailAlert,
  sendSlackAlert,
  sendToCrm,
  sendWhatsappTemplate,
} from "@/lib/integrations/routing";
import { sendCapi } from "@/lib/integrations/meta-capi";
import { sendGa4 } from "@/lib/integrations/ga4";
import type { IntegrationResult } from "@/lib/integrations/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_FILL_MS = 3000;

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const parsed = leadApiSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }
  const payload = parsed.data;
  if (!normalizeEgMobileStrict(payload.lead.mobile)) {
    return NextResponse.json({ ok: false, error: "validation", issues: [{ path: "lead.mobile", message: "mobile_invalid" }] }, { status: 400 });
  }
  const ip = clientIp(req.headers);
  const now = new Date();

  // Bots: honeypot filled or impossibly fast. Pretend success, do nothing.
  if (payload.meta.website || now.getTime() - payload.meta.started_at < MIN_FILL_MS) {
    console.warn("[lead:bot]", ip);
    return NextResponse.json({ ok: true, token: null });
  }
  if (await rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  if (!(await verifyTurnstile(payload.meta.turnstile_token, ip))) {
    return NextResponse.json({ ok: false, error: "captcha" }, { status: 403 });
  }

  const record = buildLeadRecord(payload, { leadId: randomUUID(), submittedAt: now });
  const duplicate = await isDuplicatePhone(record.mobile);
  const token = createLeadToken({ lid: record.lead_id, eid: record.event_id, tier: record.lead_tier, fn: record.first_name });
  const userAgent = req.headers.get("user-agent") ?? undefined;

  // Respond immediately; routing runs after the response (waitUntil on Vercel).
  after(async () => {
    if (duplicate) {
      await sendBackup(record, "duplicate_24h");
      return;
    }
    const tasks: Promise<IntegrationResult>[] = [
      sendToCrm(record),
      sendBackup(record, "new"),
      sendSlackAlert(record),
      sendEmailAlert(record),
      sendGa4(record.client_id as string, "lead_received_server", {
        lead_tier: record.lead_tier,
        fleet_size: record.fleet_size,
        lead_intent: record.lead_intent,
        ab_variant: record.ab_variant,
        event_id: record.event_id,
      }),
    ];
    if (record.lead_tier !== "C" || payload.lead.preferred_contact === "whatsapp") {
      tasks.push(sendWhatsappTemplate(record));
    }
    if (adUserDataAllowed(payload.meta.consent_state)) {
      const [fn, ...rest] = record.full_name.split(" ");
      tasks.push(
        sendCapi([
          {
            event_name: "Lead",
            event_id: record.event_id, // identical to Pixel eventID → dedup
            action_source: "website",
            event_source_url: (record.landing_page_url as string) || undefined,
            user: {
              phoneE164: record.mobile,
              email: (record.email as string) || undefined,
              firstName: fn,
              lastName: rest.join(" ") || undefined,
              city: record.governorate,
              country: "eg",
              externalId: record.lead_id,
              fbp: (record.fbp as string) || undefined,
              fbc: (record.fbc as string) || undefined,
              ip,
              userAgent,
            },
            custom_data: {
              currency: "EGP",
              value: record.value,
              lead_tier: record.lead_tier,
              fleet_size: record.fleet_size,
            },
          },
        ]),
      );
    }

    const results = await Promise.allSettled(tasks);
    const summary = results.map((r) => (r.status === "fulfilled" ? r.value : { name: "?", status: "failed", detail: String(r.reason) }));
    const crm = summary.find((s) => s.name === "crm");
    if (crm?.status === "failed") {
      await sendBackup(record, "crm_failed"); // dead-letter row
      await alertFailure(record, crm.detail ?? "");
    }
    console.info("[lead:routed]", record.lead_id, record.lead_tier, JSON.stringify(summary));
  });

  return NextResponse.json({
    ok: true,
    token,
    lead_id: record.lead_id,
    lead_tier: record.lead_tier,
    value: record.value,
    duplicate,
  });
}
