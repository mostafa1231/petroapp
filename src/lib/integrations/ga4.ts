import { postJson, skipped, type IntegrationResult } from "./http";

/**
 * GA4 Measurement Protocol. Uses a distinct event name
 * (`lead_received_server`) so it never double-counts the browser
 * `generate_lead` key event — use it for reconciliation only.
 */
export async function sendGa4(clientId: string | undefined, name: string, params: Record<string, unknown>): Promise<IntegrationResult> {
  const id = process.env.GA4_MEASUREMENT_ID ?? process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const secret = process.env.GA4_API_SECRET;
  if (!id || !secret) return skipped("ga4_mp");
  const res = await postJson(
    `https://www.google-analytics.com/mp/collect?measurement_id=${id}&api_secret=${secret}`,
    {
      client_id: clientId || `srv.${Date.now()}`,
      events: [{ name, params: { ...params, engagement_time_msec: 1 } }],
    },
    { retries: 1 },
  );
  return { name: "ga4_mp", status: res.ok ? "ok" : "failed" };
}
