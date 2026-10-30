/**
 * First/last-touch attribution captured on every landing and stored in a
 * first-party cookie for 90 days. Pure parsing helpers are unit-tested;
 * browser helpers are no-ops on the server.
 */

export const ATTR_COOKIE = "pa_attr";
export const ATTR_MAX_AGE = 60 * 60 * 24 * 90;

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id"] as const;
export const CLICK_ID_KEYS = ["gclid", "gbraid", "wbraid", "fbclid", "ttclid", "li_fat_id"] as const;
const ALL_KEYS = [...UTM_KEYS, ...CLICK_ID_KEYS] as const;

export type Touch = Partial<Record<(typeof ALL_KEYS)[number], string>> & {
  landing_page_url?: string;
  referrer?: string;
  ts?: number;
};

export interface AttributionState {
  first?: Touch;
  last?: Touch;
}

/** Extracts UTMs/click IDs from a query string. Returns null if none present. */
export function parseTouch(search: string, extra: Pick<Touch, "landing_page_url" | "referrer" | "ts"> = {}): Touch | null {
  const params = new URLSearchParams(search);
  const touch: Touch = {};
  let found = false;
  for (const k of ALL_KEYS) {
    const v = params.get(k);
    if (v) {
      touch[k] = v.slice(0, 500);
      found = true;
    }
  }
  return found ? { ...touch, ...extra } : null;
}

/**
 * Merges a new touch: first touch is kept forever (within cookie life),
 * last touch is replaced only by a visit that carries campaign params.
 */
export function mergeTouch(state: AttributionState, touch: Touch | null, fallback: Touch): AttributionState {
  if (touch) return { first: state.first ?? touch, last: touch };
  if (!state.first) return { first: fallback, last: fallback };
  return state;
}

/** Meta's _fbc format: fb.1.<ms timestamp>.<fbclid>. */
export function buildFbc(fbclid: string, ts = Date.now()): string {
  return `fb.1.${ts}.${fbclid}`;
}

/** Query params worth preserving on internal navigation (language toggle, thank-you). */
export function preservedQuery(search: string): string {
  const params = new URLSearchParams(search);
  const out = new URLSearchParams();
  for (const k of ALL_KEYS) {
    const v = params.get(k);
    if (v) out.set(k, v);
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

// ---------- browser helpers ----------

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&")}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

export function readAttribution(): AttributionState {
  try {
    const raw = readCookie(ATTR_COOKIE);
    return raw ? (JSON.parse(raw) as AttributionState) : {};
  } catch {
    return {};
  }
}

/** Call once per page load. */
export function captureAttribution(): AttributionState {
  if (typeof window === "undefined") return {};
  const now = Date.now();
  const ctx = { landing_page_url: location.href.slice(0, 2000), referrer: document.referrer.slice(0, 2000), ts: now };
  const touch = parseTouch(location.search, ctx);
  const state = mergeTouch(readAttribution(), touch, ctx);
  writeCookie(ATTR_COOKIE, JSON.stringify(state), ATTR_MAX_AGE);

  // Synthesize _fbc if Meta pixel hasn't set it yet (or consent blocked it).
  if (touch?.fbclid && !readCookie("_fbc")) {
    writeCookie("_fbc", buildFbc(touch.fbclid, now), ATTR_MAX_AGE);
  }
  return state;
}
