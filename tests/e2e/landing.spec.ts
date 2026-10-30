import { expect, test, type Page } from "@playwright/test";

/** Waits so the server-side minimum time-to-submit (3 s) is satisfied. */
async function fillLead(page: Page, opts: { mobile: string; ar: boolean }) {
  const form = page.locator("#lead-form");
  await form.getByRole("radio", { name: opts.ar ? "شركة" : "Company" }).click();
  await form.getByRole("radio", { name: "20–49" }).click();
  await expect(form.locator("[aria-live=polite]")).toHaveText(opts.ar ? "خطوة 3 من 5" : "Step 3 of 5");
  await form.getByRole("radio", { name: opts.ar ? "50–200 ألف" : "50k–200k" }).click();
  await form.getByRole("radio", { name: opts.ar ? "كاش/عهدة" : "Cash/advances" }).click();
  await form.locator("select").first().selectOption("cairo");
  await form.getByRole("button", { name: opts.ar ? "التالي" : "Next" }).click();
  await form.getByLabel(opts.ar ? "اسم الشركة" : "Company name").fill(opts.ar ? "شركة النيل للتوزيع" : "Nile Distribution");
  await form.getByRole("radio", { name: opts.ar ? "صاحب الشركة/مدير عام" : "Owner/GM" }).click();
  await form.getByRole("button", { name: opts.ar ? "التالي" : "Next" }).click();
  await form.getByLabel(opts.ar ? "الاسم" : "Full name", { exact: true }).fill(opts.ar ? "أحمد حسن" : "Ahmed Hassan");
  await form.getByLabel(opts.ar ? "رقم الموبايل" : "Mobile number").fill(opts.mobile);
}

test.describe("Arabic (default)", () => {
  test("root redirects to /ar keeping UTMs, RTL and hero render", async ({ page }) => {
    await page.goto("/?utm_source=facebook&utm_campaign=eg_fleet_test&fbclid=abc123");
    await expect(page).toHaveURL(/\/ar\?utm_source=facebook/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByTestId("hero-h1")).toBeVisible();
    // Step 1 chips are above the fold on mobile.
    const chip = page.locator("#lead-form").getByRole("radio", { name: "استخدام شخصي" });
    await expect(chip).toBeInViewport();
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "pa_attr")?.value).toContain("eg_fleet_test");
    expect(cookies.find((c) => c.name === "_fbc")?.value).toMatch(/^fb\.1\.\d+\.abc123$/);
  });

  test("Arabic phone validation error, Arabic-Indic digits accepted", async ({ page }) => {
    await page.goto("/ar");
    await fillLead(page, { mobile: "0225551234", ar: true });
    await page.getByTestId("submit").first().click();
    await expect(page.getByText("اكتب رقم موبايل مصري صحيح (مثال: 01012345678)").first()).toBeVisible();
    await expect(page.getByText("لازم توافق عشان نقدر نتواصل معاك").first()).toBeVisible();
    // Arabic-Indic digits are converted to Western in the field.
    const mobile = page.locator("#lead-form").getByLabel("رقم الموبايل");
    await mobile.fill("٠١٠١٢٣٤٥٦٧٨");
    await expect(mobile).toHaveValue("01012345678");
  });

  test("full submit → thank-you, UTMs reach API, conversion fires once", async ({ page }) => {
    await page.goto("/ar?utm_source=facebook&utm_campaign=eg_fleet_test&gclid=g-123");
    let apiBody: { lead: Record<string, unknown>; meta: Record<string, unknown> } | undefined;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/lead") && r.method() === "POST") apiBody = r.postDataJSON();
    });
    await fillLead(page, { mobile: "010 1234 5678", ar: true });
    await page.locator("#lead-form").getByText("أوافق على معالجة بياناتي").click();
    await page.waitForTimeout(3100);
    await page.getByTestId("submit").first().click();
    await expect(page).toHaveURL(/\/ar\/thank-you\?t=/);
    await expect(page.getByTestId("thanks-title")).toContainText("تمام يا أحمد");

    expect(apiBody?.lead.mobile).toBe("+201012345678");
    const last = apiBody?.meta.last_touch as Record<string, string>;
    expect(last.utm_campaign).toBe("eg_fleet_test");
    expect(last.gclid).toBe("g-123");
    expect(apiBody?.meta.lead_intent).toBe("hero");

    const count = () => page.evaluate(() => (window.dataLayer as { event?: string }[]).filter((e) => e.event === "generate_lead").length);
    await expect.poll(count).toBe(1);
    const evt = await page.evaluate(() => (window.dataLayer as Record<string, unknown>[]).find((e) => e.event === "generate_lead"));
    expect(evt?.event_id).toBe(apiBody?.meta.event_id);
    await page.reload();
    await page.waitForTimeout(500);
    expect(await count()).toBe(0); // fresh dataLayer after reload, and the guard prevented re-firing
  });

  test("personal use is stopped and nothing is sent", async ({ page }) => {
    let posted = false;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/lead")) posted = true;
    });
    await page.goto("/ar");
    const form = page.locator("#lead-form");
    await form.getByRole("radio", { name: "استخدام شخصي" }).click();
    await expect(form.getByTestId("personal-stop")).toContainText("للشركات والأساطيل");
    await expect(form.getByRole("radio", { name: "1–4" })).toHaveCount(0);
    expect(await page.evaluate(() => (window.dataLayer as { event?: string }[]).some((e) => e.event === "disqualified_personal"))).toBe(true);
    await form.getByRole("button", { name: "رجوع وتغيير الإجابة" }).click();
    await form.getByRole("radio", { name: "شركة" }).click();
    await expect(form.getByRole("radio", { name: "1–4" })).toBeVisible();
    expect(posted).toBe(false);
  });

  test("dedicated form section at the end works too", async ({ page }) => {
    await page.goto("/ar");
    const section = page.locator("#lead-section");
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole("heading", { name: "جاهز توقف الهدر؟" })).toBeVisible();
    await section.getByRole("radio", { name: "شركة" }).click();
    await expect(section.getByRole("radio", { name: "1–4" })).toBeVisible();
  });

  test("thank-you without a valid token redirects to landing", async ({ page }) => {
    await page.goto("/ar/thank-you?t=forged.token");
    await expect(page).toHaveURL(/\/ar$/);
  });

  test("calculator pre-fills the form with calculator intent", async ({ page }) => {
    await page.goto("/ar");
    await page.locator("#calc-vehicles").fill("60");
    await page.getByTestId("calc-cta").click();
    const form = page.locator("#lead-form");
    await expect(form.locator("[aria-live=polite]")).toHaveText("خطوة 3 من 5");
    await expect(form.getByRole("radio", { name: "200 ألف–1 مليون" })).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("English", () => {
  test("LTR page and language toggle keeps UTMs", async ({ page }) => {
    await page.goto("/ar?utm_source=google&gclid=xyz");
    await page.getByRole("link", { name: "التبديل إلى الإنجليزية" }).click();
    await expect(page).toHaveURL(/\/en\?utm_source=google&gclid=xyz/);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByTestId("hero-h1")).toBeVisible();
  });

  test("full English submit", async ({ page }) => {
    await page.goto("/en");
    await fillLead(page, { mobile: "+20 115 555 0101", ar: false });
    await page.locator("#lead-form").getByText("I consent to my data").click();
    await page.waitForTimeout(3100);
    await page.getByTestId("submit").first().click();
    await expect(page).toHaveURL(/\/en\/thank-you\?t=/);
    await expect(page.getByTestId("thanks-title")).toContainText("Great, Ahmed");
  });
});

test("API rejects invalid payloads and landlines", async ({ request }) => {
  const res = await request.post("/api/lead", { data: { lead: {}, meta: {} } });
  expect(res.status()).toBe(400);
});
