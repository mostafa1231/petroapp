/** fetch with timeout + exponential backoff (2 retries by default). */
export async function postJson(
  url: string,
  body: unknown,
  opts: { headers?: Record<string, string>; retries?: number; timeoutMs?: number; idempotencyKey?: string } = {},
): Promise<{ ok: boolean; status: number; text: string }> {
  const { retries = 2, timeoutMs = 8000, headers = {}, idempotencyKey } = opts;
  let last = { ok: false, status: 0, text: "" };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
          ...headers,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      last = { ok: res.ok, status: res.status, text: await res.text().catch(() => "") };
      // Don't retry client errors other than 408/429.
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429)) return last;
    } catch (err) {
      last = { ok: false, status: 0, text: String(err) };
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
  }
  return last;
}

export type IntegrationResult = { name: string; status: "ok" | "skipped" | "failed"; detail?: string };

export const skipped = (name: string, detail = "not configured"): IntegrationResult => ({ name, status: "skipped", detail });
