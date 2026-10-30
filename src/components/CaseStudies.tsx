"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { XIcon } from "./Icons";

interface Case {
  company: string;
  metric: string;
  detail: string;
  quote: string;
  name: string;
  role: string;
  story: string;
}

/** Case-study cards; "Read the story" opens a modal instead of a new page. */
export function CaseStudies() {
  const t = useTranslations("proof");
  const cases = t.raw("cases") as Case[];
  const ref = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<Case | null>(null);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {cases.map((c) => (
          <article key={c.company} className="card flex flex-col p-5">
            <div className="flex items-center gap-3">
              <div aria-hidden className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-lg font-bold text-brand">
                {c.company.trim().charAt(0)}
              </div>
              <div>
                <h3 className="font-bold">{c.company}</h3>
                <p className="text-sm text-muted">{c.detail}</p>
              </div>
            </div>
            <p className="mt-4 text-2xl font-bold text-brand">{c.metric}</p>
            <blockquote className="mt-3 flex-1 text-muted">“{c.quote}”</blockquote>
            <p className="mt-3 text-sm font-semibold">
              {c.name} · <span className="font-normal text-muted">{c.role}</span>
            </p>
            <button
              type="button"
              className="mt-4 min-h-11 self-start font-semibold text-brand underline"
              data-cta="case_study"
              data-loc="proof"
              onClick={() => {
                setActive(c);
                ref.current?.showModal();
              }}
            >
              {t("readStory")}
            </button>
          </article>
        ))}
      </div>
      <dialog
        ref={ref}
        aria-labelledby="case-title"
        className="m-auto w-[min(92vw,36rem)] rounded-2xl p-0 shadow-2xl"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        {active && (
          <div className="relative p-6">
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label={t("close")}
              className="absolute end-3 top-3 inline-flex size-11 items-center justify-center rounded-full hover:bg-surface"
            >
              <XIcon className="size-5" />
            </button>
            <h2 id="case-title" className="pe-10 text-xl font-bold">
              {active.company}
            </h2>
            <p className="mt-1 text-lg font-bold text-brand">{active.metric}</p>
            <p className="mt-4 leading-relaxed">{active.story}</p>
            <blockquote className="mt-4 border-s-4 border-brand ps-4 text-muted">“{active.quote}”</blockquote>
          </div>
        )}
      </dialog>
    </>
  );
}
