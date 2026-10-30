"use client";

import { useTranslations } from "next-intl";
import { preservedQuery } from "@/lib/attribution";
import { track } from "@/lib/tracking";

/** Switches /ar ↔ /en keeping UTMs/click IDs and the scroll position. */
export function LangToggle({ locale, path = "" }: { locale: "ar" | "en"; path?: string }) {
  const t = useTranslations("header");
  const target = locale === "ar" ? "en" : "ar";
  const href = `/${target}${path}`;

  return (
    <a
      href={href}
      hrefLang={target}
      lang={target}
      aria-label={t("switchLabel")}
      className="btn btn-ghost min-h-11 px-3 text-sm"
      onClick={(e) => {
        e.preventDefault();
        track("lang_switch", { to_locale: target });
        try {
          const h = document.documentElement.scrollHeight - innerHeight;
          sessionStorage.setItem("pa_scroll", String(h > 0 ? scrollY / h : 0));
        } catch {
          /* ignore */
        }
        const params = new URLSearchParams(location.search);
        const keep = preservedQuery(location.search);
        const t = params.get("t"); // thank-you token
        location.assign(`${href}${keep}${t ? `${keep ? "&" : "?"}t=${encodeURIComponent(t)}` : ""}`);
      }}
    >
      {t("switchTo")}
    </a>
  );
}
