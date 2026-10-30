"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Invisible-by-default Cloudflare Turnstile; loads only when the form is in use. */
export function Turnstile({ active, onToken }: { active: boolean; onToken: (t: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!siteKey || !active || !el.current) return;
    let widgetId: string | undefined;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.turnstile || !el.current) return;
      widgetId = window.turnstile.render(el.current, {
        sitekey: siteKey,
        appearance: "interaction-only",
        language: document.documentElement.lang,
        callback: (t: string) => cb.current(t),
      });
    };
    if (window.turnstile) render();
    else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
      if (!s) {
        s = document.createElement("script");
        s.src = SRC;
        s.async = true;
        document.head.appendChild(s);
      }
      s.addEventListener("load", render, { once: true });
    }
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [active, siteKey]);

  if (!siteKey) return null;
  return <div ref={el} className="mt-3" />;
}
