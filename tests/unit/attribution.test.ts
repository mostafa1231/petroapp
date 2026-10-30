import { describe, expect, it } from "vitest";
import { buildFbc, mergeTouch, parseTouch, preservedQuery } from "@/lib/attribution";

describe("attribution", () => {
  it("parses UTMs and click IDs", () => {
    const t = parseTouch("?utm_source=facebook&utm_campaign=eg_fleet_leads_202611&fbclid=abc&gclid=g1&x=1", { ts: 1 });
    expect(t).toEqual({ utm_source: "facebook", utm_campaign: "eg_fleet_leads_202611", fbclid: "abc", gclid: "g1", ts: 1 });
  });
  it("returns null without campaign params", () => {
    expect(parseTouch("?foo=bar")).toBeNull();
  });
  it("keeps first touch and replaces last touch only on campaign visits", () => {
    const first = { utm_source: "google", ts: 1 };
    const s1 = mergeTouch({}, first, { ts: 1 });
    expect(s1).toEqual({ first, last: first });
    const s2 = mergeTouch(s1, null, { ts: 2 });
    expect(s2).toBe(s1);
    const second = { utm_source: "facebook", ts: 3 };
    expect(mergeTouch(s2, second, { ts: 3 })).toEqual({ first, last: second });
  });
  it("records a direct first touch", () => {
    expect(mergeTouch({}, null, { referrer: "", ts: 5 })).toEqual({ first: { referrer: "", ts: 5 }, last: { referrer: "", ts: 5 } });
  });
  it("builds _fbc", () => {
    expect(buildFbc("abc", 123)).toBe("fb.1.123.abc");
  });
  it("preserves only tracking params on navigation", () => {
    expect(preservedQuery("?utm_source=fb&t=secret&gclid=1&variant=B")).toBe("?utm_source=fb&gclid=1");
    expect(preservedQuery("?a=1")).toBe("");
  });
});
