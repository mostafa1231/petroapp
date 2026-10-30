"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { site } from "@config/site";
import { whatsappLink } from "@/lib/whatsapp";
import { useDraft } from "@/lib/draft-store";
import { CalcIcon, PhoneIcon, WhatsAppIcon } from "./Icons";

/**
 * Mobile-only bottom bar. Appears after 30% scroll, hides whenever a lead
 * form is on screen so it never covers the inputs.
 */
export function StickyMobileBar() {
  const t = useTranslations("sticky");
  const tw = useTranslations("wa");
  const to = useTranslations("options");
  const draft = useDraft();
  const [scrolled, setScrolled] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      setScrolled(h > 0 && scrollY / h >= 0.3);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });

    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        setFormVisible(visible.size > 0);
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll("[data-lead-form]").forEach((el) => io.observe(el));
    return () => {
      removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  const show = scrolled && !formVisible;
  const fleet = draft.values.fleet_size;
  const wa = whatsappLink(fleet ? tw("withFleet", { fleet: to(`fleet_size.${fleet}`) }) : tw("default"));

  return (
    <nav
      aria-label="quick actions"
      aria-hidden={!show}
      inert={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-200 md:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="grid grid-cols-3 gap-2 p-2">
        <a href="#calculator" data-cta="sticky_calc" data-loc="sticky_bar" className="btn btn-primary min-h-12 px-2 text-sm">
          <CalcIcon className="size-5" />
          {t("calc")}
        </a>
        <a href={wa} target="_blank" rel="noopener" data-loc="sticky_bar" className="btn btn-wa-solid min-h-12 px-2 text-sm">
          <WhatsAppIcon className="size-5" />
          {t("whatsapp")}
        </a>
        <a href={`tel:${site.contact.salesPhoneE164}`} data-loc="sticky_bar" className="btn btn-ghost min-h-12 px-2 text-sm">
          <PhoneIcon className="size-5" />
          {t("call")}
        </a>
      </div>
    </nav>
  );
}
