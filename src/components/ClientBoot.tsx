"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";
import { track, trackContact } from "@/lib/tracking";
import { QUEUE_KEY } from "@/lib/keys";

/**
 * Page-level client bootstrap (renders nothing):
 * attribution capture, page_view context, scroll depth, CTA/contact click
 * delegation, scroll restore after language switch, offline lead queue flush.
 */
export function ClientBoot({ locale, variant, pageType = "landing" }: { locale: string; variant?: string; pageType?: string }) {
  useEffect(() => {
    captureAttribution();
    track("page_view", { locale, ab_variant: variant ?? "", page_type: pageType });

    // Restore scroll position after language toggle.
    try {
      const ratio = sessionStorage.getItem("pa_scroll");
      if (ratio) {
        sessionStorage.removeItem("pa_scroll");
        requestAnimationFrame(() => scrollTo({ top: Number(ratio) * (document.documentElement.scrollHeight - innerHeight), behavior: "instant" as ScrollBehavior }));
      }
    } catch {
      /* ignore */
    }

    // Scroll depth 25/50/75/90.
    const marks = [25, 50, 75, 90];
    const fired = new Set<number>();
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (h <= 0) return;
      const pct = (scrollY / h) * 100;
      for (const m of marks) if (pct >= m && !fired.has(m)) {
        fired.add(m);
        track("scroll_depth", { percent: m });
      }
    };
    addEventListener("scroll", onScroll, { passive: true });

    // Click delegation: CTAs, WhatsApp, phone.
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("a, button");
      if (!el) return;
      const href = el.getAttribute("href") ?? "";
      const location = el.dataset.loc ?? el.dataset.wa ?? el.closest("[data-section]")?.getAttribute("data-section") ?? "unknown";
      if (href.startsWith("https://wa.me/")) trackContact("whatsapp_click", { location });
      else if (href.startsWith("tel:")) trackContact("phone_click", { location });
      if (el.dataset.cta) track("cta_click", { cta_id: el.dataset.cta, location });
    };
    document.addEventListener("click", onClick);

    // Flush leads queued while offline.
    void flushQueue();

    return () => {
      removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
    };
  }, [locale, variant, pageType]);

  return null;
}

async function flushQueue() {
  let queue: unknown[] = [];
  try {
    queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return;
  }
  if (!queue.length) return;
  const remaining: unknown[] = [];
  for (const p of queue) {
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
      if (res.status >= 500) remaining.push(p);
    } catch {
      remaining.push(p);
    }
  }
  try {
    if (remaining.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* ignore */
  }
}
