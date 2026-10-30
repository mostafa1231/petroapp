import { hashOrUndefined, normalize } from "../hash";
import { postJson, skipped, type IntegrationResult } from "./http";

const GRAPH_VERSION = "v21.0";

export interface CapiUser {
  phoneE164?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
  externalId?: string;
  fbp?: string;
  fbc?: string;
  ip?: string;
  userAgent?: string;
}

export interface CapiEvent {
  event_name: string;
  event_id: string;
  event_time?: number;
  action_source: "website" | "system_generated" | "chat" | "phone_call";
  event_source_url?: string;
  user: CapiUser;
  custom_data?: Record<string, unknown>;
}

/** Builds a CAPI event with SHA-256 normalised user data. Pure — unit-tested. */
export function buildCapiEvent(e: CapiEvent, now = Date.now()) {
  const u = e.user;
  const user_data: Record<string, unknown> = {
    ph: wrap(hashOrUndefined(u.phoneE164, normalize.phone)),
    em: wrap(hashOrUndefined(u.email, normalize.email)),
    fn: wrap(hashOrUndefined(u.firstName, normalize.name)),
    ln: wrap(hashOrUndefined(u.lastName, normalize.name)),
    ct: wrap(hashOrUndefined(u.city, normalize.city)),
    country: wrap(hashOrUndefined(u.country, normalize.country)),
    external_id: wrap(hashOrUndefined(u.externalId, (s) => s.trim())),
    fbp: u.fbp || undefined,
    fbc: u.fbc || undefined,
    client_ip_address: u.ip || undefined,
    client_user_agent: u.userAgent || undefined,
  };
  for (const k of Object.keys(user_data)) if (user_data[k] === undefined) delete user_data[k];

  return {
    event_name: e.event_name,
    event_time: e.event_time ?? Math.floor(now / 1000),
    event_id: e.event_id,
    action_source: e.action_source,
    ...(e.event_source_url ? { event_source_url: e.event_source_url } : {}),
    user_data,
    ...(e.custom_data ? { custom_data: e.custom_data } : {}),
  };
}

const wrap = (v: string | undefined) => (v ? [v] : undefined);

export async function sendCapi(events: CapiEvent[]): Promise<IntegrationResult> {
  const pixel = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return skipped("meta_capi");
  const body: Record<string, unknown> = { data: events.map((e) => buildCapiEvent(e)) };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
  const res = await postJson(
    `https://graph.facebook.com/${GRAPH_VERSION}/${pixel}/events?access_token=${encodeURIComponent(token)}`,
    body,
  );
  return { name: "meta_capi", status: res.ok ? "ok" : "failed", detail: res.ok ? undefined : `${res.status} ${res.text.slice(0, 200)}` };
}
