import { site } from "../../config/site";

export type Locale = "ar" | "en";

function numberLocale(locale: Locale) {
  if (locale === "en") return "en-EG";
  return site.numerals.arabicIndic ? "ar-EG" : "ar-EG-u-nu-latn";
}

export function formatNumber(n: number, locale: Locale, maxFractionDigits = 0): string {
  return new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: maxFractionDigits }).format(n);
}

/** "12,500 ج.م" / "EGP 12,500". */
export function formatEgp(n: number, locale: Locale): string {
  const num = formatNumber(n, locale);
  return locale === "ar" ? `${num} ج.م` : `EGP ${num}`;
}
