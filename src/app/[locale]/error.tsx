"use client";

import { useLocale } from "next-intl";
import { whatsappLink } from "@/lib/whatsapp";

/** Branded 500 page with a WhatsApp escape hatch. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const locale = useLocale();
  const ar = locale === "ar";
  return (
    <main className="container-x flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl">{ar ? "حصلت مشكلة" : "Something went wrong"}</h1>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          {ar ? "حاول تاني" : "Try again"}
        </button>
        <a href={whatsappLink(ar ? "أهلاً بتروآب" : "Hello PetroApp")} className="btn btn-wa" target="_blank" rel="noopener">
          WhatsApp
        </a>
      </div>
    </main>
  );
}
