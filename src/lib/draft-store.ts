"use client";

import { useSyncExternalStore } from "react";
import type { LeadIntent } from "./options";
import type { LeadFormValues } from "./schema";

/**
 * Shared lead draft for every form instance on the page (hero + final CTA).
 * Persisted in sessionStorage so data survives back/reload and language toggle.
 */

export interface CalcPayload {
  vehicles: number;
  fuel_type: string;
  litres: number;
  waste_pct: number;
  est_spend: number;
  est_saving: number;
}

export interface Draft {
  values: Partial<LeadFormValues>;
  step: number;
  intent: LeadIntent;
  calc?: CalcPayload;
  startedAt?: number;
  /** id of the form instance that made the last change */
  source?: string;
  rev: number;
}

const KEY = "pa_lead_draft";
const EMPTY: Draft = { values: {}, step: 0, intent: "hero", rev: 0 };

let state: Draft = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as Draft) };
  } catch {
    /* storage blocked */
  }
}

function persist() {
  try {
    // Never persist consent ticks — they must be given fresh each session.
    const { consent_processing: _a, consent_marketing: _b, ...values } = state.values;
    void _a;
    void _b;
    sessionStorage.setItem(KEY, JSON.stringify({ ...state, values }));
  } catch {
    /* ignore */
  }
}

function set(patch: Partial<Draft>) {
  load();
  state = { ...state, ...patch, rev: state.rev + 1 };
  persist();
  listeners.forEach((l) => l());
}

export const draftStore = {
  get(): Draft {
    load();
    return state;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  setValues(values: Partial<LeadFormValues>, source: string) {
    load();
    if (JSON.stringify(values) === JSON.stringify(state.values)) return;
    set({ values, source });
  },
  setStep(step: number, source?: string) {
    set({ step, source });
  },
  start(intent: LeadIntent) {
    load();
    if (state.startedAt) return false;
    set({ startedAt: Date.now(), intent: state.intent === "hero" ? intent : state.intent });
    return true;
  },
  /** Prefill from calculator / pricing / hero chip and jump to a step. */
  prefill(values: Partial<LeadFormValues>, opts: { intent: LeadIntent; step: number; calc?: CalcPayload }) {
    load();
    set({
      values: { ...state.values, ...values },
      intent: opts.intent,
      step: opts.step,
      calc: opts.calc ?? state.calc,
      source: "external",
    });
  },
  clear() {
    state = { ...EMPTY, rev: state.rev + 1 };
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  },
};

const serverSnapshot = () => EMPTY;

export function useDraft(): Draft {
  return useSyncExternalStore(draftStore.subscribe, draftStore.get, serverSnapshot);
}

/** Scrolls to the primary (hero) form and focuses its current step. */
export function openLeadForm() {
  const el = document.getElementById("lead-form");
  if (!el) return;
  el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  setTimeout(() => el.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: true }), 400);
}
