/**
 * Anti-spam: Turnstile verification, IP rate limit and 24 h duplicate-phone
 * check. Uses Upstash Redis REST when configured, otherwise an in-memory map
 * (fine for dev / single instance; not shared across Vercel lambdas).
 */

const memory = new Map<string, { count: number; expires: number }>();

async function upstash(cmd: (string | number)[][]): Promise<unknown[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(2000),
    });
    const json = (await res.json()) as { result: unknown }[];
    return json.map((r) => r.result);
  } catch {
    return null; // fail open: never block real leads because Redis is down
  }
}

async function incr(key: string, ttlSeconds: number): Promise<number> {
  const r = await upstash([
    ["INCR", key],
    ["EXPIRE", key, ttlSeconds, "NX"],
  ]);
  if (r) return Number(r[0]);
  const now = Date.now();
  const cur = memory.get(key);
  if (!cur || cur.expires < now) {
    memory.set(key, { count: 1, expires: now + ttlSeconds * 1000 });
    return 1;
  }
  cur.count++;
  return cur.count;
}

/** Max submissions per IP per 10 minutes. */
export async function rateLimited(ip: string, limit = 5): Promise<boolean> {
  return (await incr(`rl:lead:${ip}`, 600)) > limit;
}

/** True if the same phone already submitted within 24 h. */
export async function isDuplicatePhone(phoneE164: string): Promise<boolean> {
  return (await incr(`dup:phone:${phoneE164}`, 86_400)) > 1;
}

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured → honeypot + timing still apply
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(4000),
    });
    const json = (await res.json()) as { success: boolean };
    return json.success;
  } catch {
    return true; // fail open
  }
}

export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
}
