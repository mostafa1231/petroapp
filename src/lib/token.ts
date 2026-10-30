import { createHmac, timingSafeEqual } from "node:crypto";
import type { LeadTier } from "./scoring";

/**
 * Signed, short-lived token that unlocks the thank-you page for one lead.
 * Format: base64url(json).base64url(hmac)
 */
export interface LeadTokenPayload {
  lid: string; // lead id
  eid: string; // event id
  tier: LeadTier;
  fn: string; // first name for the greeting
  exp: number; // unix seconds
}

const TTL_SECONDS = 60 * 60 * 24;

function secret(): string {
  const s = process.env.LEAD_TOKEN_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production") {
    throw new Error("LEAD_TOKEN_SECRET is required in production");
  }
  return "dev-only-insecure-lead-token-secret";
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function createLeadToken(p: Omit<LeadTokenPayload, "exp">, now = Date.now()): string {
  const body = b64(JSON.stringify({ ...p, exp: Math.floor(now / 1000) + TTL_SECONDS }));
  return `${body}.${sign(body)}`;
}

export function verifyLeadToken(token: string | undefined | null, now = Date.now()): LeadTokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as LeadTokenPayload;
    if (typeof p.exp !== "number" || p.exp * 1000 < now) return null;
    return p;
  } catch {
    return null;
  }
}
