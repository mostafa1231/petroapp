import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendCapi } from "@/lib/integrations/meta-capi";
import { clientIp } from "@/lib/integrations/guard";
import { adUserDataAllowed } from "@/lib/lead";
import { consentStateSchema } from "@/lib/schema";

export const runtime = "nodejs";

/** Browser event → Meta CAPI mirror. Same event_id as the dataLayer push. */
const META_NAME = { whatsapp_click: "Contact", phone_click: "Contact", demo_booked: "Schedule" } as const;

const schema = z.object({
  event: z.enum(["whatsapp_click", "phone_click", "demo_booked"]),
  event_id: z.string().uuid(),
  event_source_url: z.string().url().max(2000).optional(),
  location: z.string().max(40).optional(),
  consent_state: z.any().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const e = parsed.data;
  const consent = consentStateSchema.safeParse(e.consent_state);
  if (!adUserDataAllowed(consent.success ? consent.data : undefined)) return NextResponse.json({ ok: true, sent: false });

  const ip = clientIp(req.headers);
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const fbp = req.cookies.get("_fbp")?.value;
  const fbc = req.cookies.get("_fbc")?.value;

  after(() =>
    sendCapi([
      {
        event_name: META_NAME[e.event],
        event_id: e.event_id,
        action_source: "website",
        event_source_url: e.event_source_url,
        user: { ip, userAgent, fbp, fbc, country: "eg" },
        custom_data: { location: e.location, channel: e.event },
      },
    ]),
  );
  return NextResponse.json({ ok: true, sent: true });
}
