import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildCapiEvent } from "@/lib/integrations/meta-capi";
import { normalize } from "@/lib/hash";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("buildCapiEvent", () => {
  const ev = buildCapiEvent(
    {
      event_name: "Lead",
      event_id: "11111111-1111-4111-8111-111111111111",
      action_source: "website",
      event_source_url: "https://eg.petroapp.com/ar?utm_source=facebook",
      user: {
        phoneE164: "+201012345678",
        email: "  Ahmed@Example.COM ",
        firstName: " Ahmed ",
        lastName: "Hassan",
        city: "cairo",
        country: "EG",
        externalId: "lead-1",
        fbp: "fb.1.1700000000000.123",
        fbc: "fb.1.1700000000000.abc",
        ip: "41.1.2.3",
        userAgent: "UA",
      },
      custom_data: { currency: "EGP", value: 1400 },
    },
    1_700_000_000_000,
  );

  it("hashes phone as E.164 digits without +", () => {
    expect(ev.user_data.ph).toEqual([sha("201012345678")]);
  });
  it("normalises then hashes email/name/city/country", () => {
    expect(ev.user_data.em).toEqual([sha("ahmed@example.com")]);
    expect(ev.user_data.fn).toEqual([sha("ahmed")]);
    expect(ev.user_data.ln).toEqual([sha("hassan")]);
    expect(ev.user_data.ct).toEqual([sha("cairo")]);
    expect(ev.user_data.country).toEqual([sha("eg")]);
    expect(ev.user_data.external_id).toEqual([sha("lead-1")]);
  });
  it("passes fbp/fbc/ip/ua unhashed", () => {
    expect(ev.user_data.fbp).toBe("fb.1.1700000000000.123");
    expect(ev.user_data.fbc).toBe("fb.1.1700000000000.abc");
    expect(ev.user_data.client_ip_address).toBe("41.1.2.3");
    expect(ev.user_data.client_user_agent).toBe("UA");
  });
  it("keeps event_id for Pixel/CAPI dedup and sets event_time in seconds", () => {
    expect(ev.event_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(ev.event_time).toBe(1_700_000_000);
    expect(ev.action_source).toBe("website");
    expect(ev.custom_data).toEqual({ currency: "EGP", value: 1400 });
  });
  it("omits missing fields instead of hashing empty strings", () => {
    const e = buildCapiEvent({ event_name: "Contact", event_id: "x", action_source: "website", user: { country: "eg" } });
    expect(Object.keys(e.user_data)).toEqual(["country"]);
  });
  it("normalises Arabic-Indic digits in phone", () => {
    expect(normalize.phone("+٢٠١٠١٢٣٤٥٦٧٨")).toBe("201012345678");
  });
});
