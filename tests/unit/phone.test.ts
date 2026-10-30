import { describe, expect, it } from "vitest";
import { formatEgMobileNational, normalizeEgMobile, toWesternDigits } from "@/lib/phone";
import { normalizeEgMobileStrict } from "@/lib/phone-server";

describe("toWesternDigits", () => {
  it("converts Arabic-Indic and Persian digits", () => {
    expect(toWesternDigits("٠١٠١٢٣٤٥٦٧٨")).toBe("01012345678");
    expect(toWesternDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(toWesternDigits("abc ١٢")).toBe("abc 12");
  });
});

describe("normalizeEgMobile", () => {
  const ok = "+201012345678";
  it.each([
    ["01012345678", ok],
    ["010 1234 5678", ok],
    ["010-1234-5678", ok],
    ["(010) 1234 5678", ok],
    ["+201012345678", ok],
    ["+20 101 234 5678", ok],
    ["00201012345678", ok],
    ["201012345678", ok],
    ["1012345678", ok],
    ["٠١٠١٢٣٤٥٦٧٨", ok],
    ["+٢٠١٠١٢٣٤٥٦٧٨", ok],
    ["01112345678", "+201112345678"],
    ["01212345678", "+201212345678"],
    ["01512345678", "+201512345678"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeEgMobile(input)).toBe(expected);
  });

  it.each([
    ["", "empty"],
    ["0101234567", "10 digits (9 after prefix)"],
    ["010123456789", "12 digits"],
    ["01312345678", "invalid operator 013"],
    ["0225551234", "Cairo landline"],
    ["+966501234567", "Saudi mobile"],
    ["+2001012345678", "+20 followed by 0"],
    ["hello", "letters"],
  ])("rejects %s (%s)", (input) => {
    expect(normalizeEgMobile(input)).toBeNull();
  });

  it("server strict check agrees with libphonenumber", () => {
    expect(normalizeEgMobileStrict("01012345678")).toBe(ok);
    expect(normalizeEgMobileStrict("0225551234")).toBeNull();
  });

  it("formats national display", () => {
    expect(formatEgMobileNational(ok)).toBe("0101 234 5678");
  });
});
