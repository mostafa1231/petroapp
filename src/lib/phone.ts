const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

/** Converts Arabic-Indic and Persian digits to Western digits; leaves everything else. */
export function toWesternDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => {
    const a = ARABIC_INDIC.indexOf(d);
    return String(a >= 0 ? a : PERSIAN.indexOf(d));
  });
}

const EG_MOBILE_E164 = /^\+201[0125]\d{8}$/;

/**
 * Normalises any common Egyptian mobile format to E.164 (+201XXXXXXXXX).
 * Accepts 01X…, +201X…, 00201X…, 201X…, with spaces/dashes/brackets and
 * Arabic-Indic digits. Returns null for anything that isn't an EG mobile
 * (landlines, 9-digit numbers, other countries).
 */
export function normalizeEgMobile(raw: string): string | null {
  if (!raw) return null;
  let s = toWesternDigits(raw).trim();
  const hasPlus = s.startsWith("+");
  s = s.replace(/\D/g, "");

  let national: string | null = null;
  if (hasPlus && s.startsWith("20")) national = s.slice(2);
  else if (s.startsWith("0020")) national = s.slice(4);
  else if (s.startsWith("20") && s.length === 12) national = s.slice(2);
  else if (s.startsWith("0") && s.length === 11) national = s.slice(1);
  else if (s.startsWith("1") && s.length === 10) national = s; // typed without leading 0

  if (!national) return null;
  const e164 = `+20${national}`;
  return EG_MOBILE_E164.test(e164) ? e164 : null;
}

export function isEgMobile(raw: string): boolean {
  return normalizeEgMobile(raw) !== null;
}

/** "+201012345678" → "0101 234 5678" for display. */
export function formatEgMobileNational(e164: string): string {
  const n = `0${e164.replace(/^\+20/, "")}`;
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
}
