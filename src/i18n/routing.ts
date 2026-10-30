import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];

export function isLocale(v: string | undefined): v is AppLocale {
  return !!v && (routing.locales as readonly string[]).includes(v);
}
