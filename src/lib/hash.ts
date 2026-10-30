import { createHash } from "node:crypto";
import { toWesternDigits } from "./phone";

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Meta/Google normalisation rules before hashing. */
export const normalize = {
  email: (v: string) => v.trim().toLowerCase(),
  /** E.164 digits only, no "+". */
  phone: (v: string) => toWesternDigits(v).replace(/\D/g, ""),
  /** Lowercase; Meta accepts UTF-8 for non-Latin names. */
  name: (v: string) => v.trim().toLowerCase().replace(/\s+/g, " "),
  /** Lowercase, no spaces/punctuation. */
  city: (v: string) => v.trim().toLowerCase().replace(/[\s_\-.,]/g, ""),
  country: (v: string) => v.trim().toLowerCase().slice(0, 2),
};

export function hashOrUndefined(v: string | undefined | null, norm: (s: string) => string) {
  if (!v) return undefined;
  const n = norm(v);
  return n ? sha256(n) : undefined;
}
