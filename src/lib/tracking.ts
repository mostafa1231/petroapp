"use client";

/**
 * dataLayer helpers. GTM maps these events to GA4 / Meta Pixel / Google Ads
 * (see gtm/gtm-container.json). Contact events are mirrored server-side
 * through /api/event with the same event_id for CAPI deduplication.
 */

type DLParams = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

export function track(event: string, params: DLParams = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // RFC4122 v4 fallback
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16),
  );
}

export function deviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

/** GA4 client_id from the _ga cookie (GA1.1.<id>.<ts> → "<id>.<ts>"). */
export function gaClientId(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(/(?:^|; )_ga=GA\d\.\d\.(\d+\.\d+)/);
  return m?.[1];
}

/**
 * Fires a contact-type event (WhatsApp/phone/demo) to dataLayer and to the
 * server for Meta CAPI, sharing one event_id.
 */
export function trackContact(event: "whatsapp_click" | "phone_click" | "demo_booked", params: DLParams = {}) {
  const event_id = uuid();
  track(event, { ...params, event_id });
  try {
    const body = JSON.stringify({
      event,
      event_id,
      event_source_url: location.href,
      consent_state: readConsentState(),
      ...params,
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
    else void fetch("/api/event", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
  } catch {
    /* tracking must never break the CTA */
  }
}

export const CONSENT_KEY = "pa_consent";

export function readConsentState() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}
