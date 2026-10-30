"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { site } from "@config/site";
import { draftStore } from "@/lib/draft-store";
import { track } from "@/lib/tracking";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon, XIcon } from "./Icons";

const KEY = "pa_exit_shown";

/**
 * Desktop only (fine pointer, ≥1024px), once per session, never after the
 * form was started. Offers a WhatsApp deep link only — no data captured here.
 */
export function ExitIntent() {
  const t = useTranslations("exit");
  const tw = useTranslations("wa");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!site.features.exitIntent) return;
    if (!matchMedia("(pointer: fine) and (min-width: 1024px)").matches) return;
    const armedAt = Date.now();
    const onOut = (e: MouseEvent) => {
      if (e.relatedTarget || e.clientY > 0 || Date.now() - armedAt < 8000) return;
      try {
        if (sessionStorage.getItem(KEY) || draftStore.get().startedAt) return;
        sessionStorage.setItem(KEY, "1");
      } catch {
        return;
      }
      ref.current?.showModal();
      track("exit_intent_shown");
    };
    document.addEventListener("mouseout", onOut);
    return () => document.removeEventListener("mouseout", onOut);
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="exit-title"
      className="m-auto w-[min(92vw,28rem)] rounded-2xl p-0 shadow-2xl"
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className="relative p-6">
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label={t("close")}
          className="absolute end-3 top-3 inline-flex size-11 items-center justify-center rounded-full hover:bg-surface"
        >
          <XIcon className="size-5" />
        </button>
        <h2 id="exit-title" className="pe-10 text-xl font-bold">
          {t("title")}
        </h2>
        <p className="mt-2 text-muted">{t("body")}</p>
        <a
          href={whatsappLink(tw("exit"))}
          target="_blank"
          rel="noopener"
          data-loc="exit_intent"
          data-cta="exit_whatsapp"
          className="btn btn-wa-solid mt-5 w-full text-lg"
          onClick={() => ref.current?.close()}
        >
          <WhatsAppIcon className="size-6" />
          {t("cta")}
        </a>
      </div>
    </dialog>
  );
}
