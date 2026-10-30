"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { CalcPayload } from "@/lib/draft-store";
import { formatEgp, formatNumber } from "@/lib/format";
import { LAST_LEAD_KEY } from "@/lib/keys";
import { track, trackContact } from "@/lib/tracking";
import { LiteYouTube } from "./LiteYouTube";

interface LastLead {
  event_id: string;
  lead_id?: string;
  lead_tier?: string;
  value?: number;
  fleet_size?: string;
  lead_intent?: string;
  ab_variant?: string;
  calc?: CalcPayload;
  user_data?: { email?: string; phone_number?: string };
  booking?: { name?: string; phone?: string; email?: string; company?: string };
}

/**
 * Fires generate_lead exactly once per event_id (sessionStorage guard, so a
 * refresh never double-counts), shows the calculator summary and the
 * booking embed for tier A/B.
 */
export function ThankYouClient({
  eventId,
  tier,
  bookingUrl,
  locale,
  videoId,
}: {
  eventId: string;
  tier: string;
  bookingUrl: string;
  locale: "ar" | "en";
  videoId: string;
}) {
  const t = useTranslations("thanks");
  const tc = useTranslations("calc");
  const [lead, setLead] = useState<LastLead | null>(null);

  useEffect(() => {
    let last: LastLead | null = null;
    try {
      last = JSON.parse(sessionStorage.getItem(LAST_LEAD_KEY) || "null");
    } catch {
      /* ignore */
    }
    if (last && last.event_id !== eventId) last = null;
    setLead(last);

    const guard = `pa_fired_${eventId}`;
    try {
      if (sessionStorage.getItem(guard)) return;
      sessionStorage.setItem(guard, "1");
    } catch {
      return; // storage blocked → don't risk double counting
    }
    track("generate_lead", {
      event_id: eventId, // Meta Pixel eventID — same as server CAPI
      lead_tier: tier,
      fleet_size: last?.fleet_size,
      lead_intent: last?.lead_intent,
      ab_variant: last?.ab_variant,
      value: last?.value ?? 0,
      currency: "EGP",
      // Google Ads enhanced conversions (hashed by the Google tag).
      user_data: last?.user_data ? { email: last.user_data.email, phone_number: last.user_data.phone_number } : undefined,
    });
    // Drop PII from storage once the conversion has fired.
    if (last) {
      try {
        const { user_data: _u, ...rest } = last;
        void _u;
        sessionStorage.setItem(LAST_LEAD_KEY, JSON.stringify(rest));
      } catch {
        /* ignore */
      }
    }
  }, [eventId, tier]);

  // demo_booked from Calendly / Cal.com embeds.
  useEffect(() => {
    if (!bookingUrl) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { event?: string; type?: string } | undefined;
      const name = typeof d === "object" && d ? d.event ?? d.type ?? "" : "";
      if (name === "calendly.event_scheduled" || /booking_?successful|bookingSuccessful/i.test(name)) {
        trackContact("demo_booked", { location: "thank_you" });
      }
    };
    addEventListener("message", onMsg);
    return () => removeEventListener("message", onMsg);
  }, [bookingUrl]);

  const calc = lead?.calc;
  const b = lead?.booking;
  let src = "";
  if (bookingUrl) {
    try {
      const u = new URL(bookingUrl);
      if (b?.name) u.searchParams.set("name", b.name);
      if (b?.email) u.searchParams.set("email", b.email);
      if (b?.phone) u.searchParams.set("phone", b.phone);
      if (b?.company) u.searchParams.set("company", b.company);
      u.searchParams.set("embed_domain", typeof location !== "undefined" ? location.host : "");
      src = u.toString();
    } catch {
      src = "";
    }
  }

  return (
    <>
      {calc?.est_spend ? (
        <section className="card mt-6 p-5 sm:p-6">
          <h2 className="text-xl">{t("calcTitle")}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted">{tc("vehicles")}</dt>
              <dd className="text-lg font-bold">
                <bdi>{formatNumber(calc.vehicles, locale)}</bdi>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{tc("monthlySpend")}</dt>
              <dd className="text-lg font-bold">
                <bdi>{formatEgp(calc.est_spend, locale)}</bdi>
              </dd>
            </div>
            <div className="col-span-2 rounded-xl bg-brand-50 p-3">
              <dt className="text-sm text-muted">{tc("saving")}</dt>
              <dd className="text-2xl font-bold text-brand">
                <bdi>{formatEgp(calc.est_saving, locale)}</bdi> <span className="text-base font-normal">{tc("perYear")}</span>
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {src && (
        <section className="card mt-6 overflow-hidden">
          <h2 className="p-5 text-xl">{t("book")}</h2>
          <iframe src={src} title={t("book")} className="h-[680px] w-full border-0" loading="lazy" />
        </section>
      )}

      {videoId && (
        <div className="mt-6">
          <LiteYouTube id={videoId} title="PetroApp" />
        </div>
      )}
    </>
  );
}
