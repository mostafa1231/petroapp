"use client";

import type { ReactNode } from "react";
import { draftStore, openLeadForm } from "@/lib/draft-store";
import type { LeadIntent } from "@/lib/options";

/** Any CTA that should open the lead form with a given intent. */
export function OpenFormButton({ intent, cta, className, children }: { intent: LeadIntent; cta: string; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      data-cta={cta}
      className={className}
      onClick={() => {
        const d = draftStore.get();
        draftStore.prefill({}, { intent, step: d.values.customer_type === "company" && d.values.fleet_size ? Math.max(d.step, 2) : 0 });
        openLeadForm();
      }}
    >
      {children}
    </button>
  );
}
