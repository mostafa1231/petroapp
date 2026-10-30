/**
 * One live test at a time (see README → A/B roadmap).
 * Middleware assigns a sticky cookie and rewrites /ar → /ar/v/<variant>,
 * so every variant is a static page with no flicker.
 */
export const experiment = {
  id: "hero_register_2026_11",
  cookie: "ab_hero",
  /** Variant keys must match messages: hero.h1.<variant>. */
  variants: ["A", "B"] as const,
  /** Share of traffic for the first variant (0–1). */
  splitA: 0.5,
  description: "A = Egyptian Arabic headline, B = MSA headline",
};

export type Variant = (typeof experiment.variants)[number];

export function isVariant(v: string | undefined): v is Variant {
  return !!v && (experiment.variants as readonly string[]).includes(v);
}
