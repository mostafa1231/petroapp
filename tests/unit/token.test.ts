import { describe, expect, it } from "vitest";
import { createLeadToken, verifyLeadToken } from "@/lib/token";

const p = { lid: "lead-1", eid: "evt-1", tier: "A" as const, fn: "أحمد" };

describe("lead token", () => {
  it("round-trips including Arabic names", () => {
    expect(verifyLeadToken(createLeadToken(p))).toMatchObject(p);
  });
  it("rejects tampering", () => {
    const tok = createLeadToken(p);
    const [body, sig] = tok.split(".");
    const forged = Buffer.from(JSON.stringify({ ...p, tier: "C", exp: 9e9 })).toString("base64url");
    expect(verifyLeadToken(`${forged}.${sig}`)).toBeNull();
    expect(verifyLeadToken(`${body}.x${sig.slice(1)}`)).toBeNull();
  });
  it("rejects expired, empty and malformed tokens", () => {
    const old = createLeadToken(p, Date.now() - 2 * 86_400_000);
    expect(verifyLeadToken(old)).toBeNull();
    expect(verifyLeadToken("")).toBeNull();
    expect(verifyLeadToken(undefined)).toBeNull();
    expect(verifyLeadToken("abc")).toBeNull();
  });
});
