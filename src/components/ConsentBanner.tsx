"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { site } from "@config/site";
import { CONSENT_KEY, track } from "@/lib/tracking";

type Choice = "granted" | "denied";

/**
 * Bilingual consent banner wired to Google Consent Mode v2. Defaults are set
 * inline in <head> (see layout). Choice is stored and sent with each lead.
 * Fixed-position so it causes no layout shift.
 */
export function ConsentBanner() {
  const t = useTranslations("consent");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setOpen(true);
    } catch {
      setOpen(site.features.consentDefault === "denied");
    }
  }, []);

  function choose(v: Choice) {
    const state = { ad_storage: v, analytics_storage: v, ad_user_data: v, ad_personalization: v };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("consent", "update", state);
    track("consent_update", { consent: v });
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div
      role="region"
      aria-label={t("label")}
      className="fixed inset-x-2 bottom-2 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)] md:bottom-4"
    >
      <p className="text-sm">
        {t("text")}{" "}
        <a href={site.legal.privacyPolicyUrl} className="font-semibold text-brand underline" target="_blank" rel="noopener">
          {t("label")}
        </a>
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-primary min-h-11 flex-1" onClick={() => choose("granted")}>
          {t("accept")}
        </button>
        <button type="button" className="btn btn-ghost min-h-11 flex-1" onClick={() => choose("denied")}>
          {t("reject")}
        </button>
      </div>
    </div>
  );
}
