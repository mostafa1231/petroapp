import "server-only"; // build-time guard; aliased to a no-op in Vitest
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { normalizeEgMobile } from "./phone";

/**
 * Server-side second opinion using libphonenumber metadata (kept out of the
 * client bundle). Returns E.164 or null.
 */
export function normalizeEgMobileStrict(raw: string): string | null {
  const e164 = normalizeEgMobile(raw);
  if (!e164) return null;
  const parsed = parsePhoneNumberFromString(e164, "EG");
  return parsed?.isValid() && parsed.country === "EG" ? e164 : null;
}
