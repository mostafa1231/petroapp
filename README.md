# PetroApp Egypt — Fleet Lead-Capture Landing Page

Arabic-first (RTL), mobile-first, single-goal landing page for PetroApp Egypt.
It has one conversion (a qualified 4-step lead form) and three secondary paths:
WhatsApp, phone and demo booking. Every lead goes to sales within seconds, with
fleet size, spend, role and full attribution attached.

- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 (logical utilities only) · next-intl · React Hook Form + Zod (`zod/v4-mini`, one schema shared by client and server) · Vitest · Playwright
- **Routes:** `/` → `/ar` (default) · `/en` · `/{locale}/thank-you` (token-gated, noindex) · `POST /api/lead` · `POST /api/event` · `POST /api/crm/stage`
- **Runs with zero secrets.** Every integration is skipped when its env var is missing, and the lead is logged to stdout, so local dev, previews and CI all work.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # fill what you have; everything is optional except LEAD_TOKEN_SECRET in production
npm run dev                  # http://localhost:3000 → /ar
```

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint + RTL lint (blocks `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests: phone normalisation, scoring, CAPI hashing, calculator, token, attribution, schema |
| `npm run test:e2e` | Playwright on mobile (Pixel 7) and desktop: both locales, full submit, thank-you guard, UTMs |
| `node scripts/build-gtm.mjs` | Regenerates `gtm/gtm-container.json` |
| `node scripts/og/render.cjs` | Re-renders `public/og/og-{ar,en}.png` (1200×630) |

### Deploy (Vercel)

```bash
npx vercel link
npx vercel env add LEAD_TOKEN_SECRET production
npx vercel --prod
```

Set the rest of the env vars in Vercel → Project → Settings → Environment Variables.
Lead routing runs in `after()` (Vercel `waitUntil`), so the user gets the thank-you page without waiting for the CRM.

---

## Where to edit things (no component changes needed)

| What | File |
|---|---|
| All copy, both languages (hero = light Egyptian Arabic; features/FAQ/legal = MSA) | `messages/ar.json`, `messages/en.json` |
| Phone/WhatsApp, hours, station count, **fuel prices**, savings claims, pricing teaser, client logos, feature flags | `config/site.ts` |
| Live A/B test (variants, split) | `config/experiments.ts` |
| Internal field → CRM field names | `config/crm-map.ts` |

**After each quarterly fuel-price review**, update `site.fuelPrices.prices` and `site.fuelPrices.label`. The calculator and the pain-section copy (`pain.items[2]`) read from there.

**Numerals:** Western digits by default. Set `site.numerals.arabicIndic = true` to test Arabic-Indic digits.

### Adding an A/B variant
1. Add the key to `experiment.variants` in `config/experiments.ts` (e.g. `["A","B","C"]`).
2. Add `hero.h1.C` to both message files, or branch on `variant` in `src/components/Sections.tsx → Hero`.
3. Middleware assigns a sticky `ab_hero` cookie and rewrites `/ar` → `/ar/v/<variant>`. Each variant is a static page, so there is no flicker. Force one for QA with `?variant=B`.
4. `ab_variant` is sent in `page_view`, `generate_lead`, the lead payload and the CRM record.

Run one test at a time (roadmap in the brief §10). The primary metric is qualified leads (tier A+B) per 1,000 sessions. The guardrails are cost per appointment against the Meta lead-form baseline (CPL 34.98 SAR, 66.1% appointment rate, Q1 2026).

---

## How a lead flows

```
Hero chip / calculator / pricing CTA
  └─ 4-step form (draft shared across both form instances via sessionStorage)
       └─ POST /api/lead  { lead, meta: event_id, attribution, consent, calculator, … }
            ├─ Zod validation (same schema as the client) + libphonenumber check
            ├─ honeypot, ≥3 s time-to-submit, Turnstile, IP rate limit (5/10 min)
            ├─ duplicate phone within 24 h → backup row only
            ├─ score → tier A/B/C (A: ≥20 vehicles + owner/fleet/finance + ≥50k EGP/mo)
            ├─ respond 200 + signed token  →  /{locale}/thank-you?t=…
            └─ after(): CRM webhook (retries, Idempotency-Key = event_id)
                        backup row (Sheets) · Slack + email alert (tap-to-call)
                        WhatsApp template (optional) · Meta CAPI Lead (same event_id)
                        GA4 MP `lead_received_server` · dead-letter + alert if CRM fails
```

**Speed-to-lead SLA:** tier A has a 5-minute target and tier B 15 minutes. Tier C goes to WhatsApp nurture. `sla_minutes` and `submitted_at` are sent to the CRM. Report the median time to first contact weekly.

**Offline / failures:** the client retries 3 times. If the network is down, the payload is queued in `localStorage`, a WhatsApp fallback is shown, and the queue is flushed on the next page load. If the CRM is down, the backup row is still written, Slack is alerted and the user still sees the thank-you page.

### Backup sheet (Google Apps Script)
Create a Sheet, then Extensions → Apps Script. Paste the script below, deploy it as a web app (execute as you, access: anyone), and put the URL in `BACKUP_WEBHOOK_URL`.

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const headers = sh.getLastRow() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
  Object.keys(data).forEach((k) => { if (!headers.includes(k)) { headers.push(k); sh.getRange(1, headers.length).setValue(k); } });
  sh.appendRow(headers.map((h) => data[h] ?? ""));
  return ContentService.createTextOutput("ok");
}
```
(Optionally check `e.parameter` / a header against `BACKUP_WEBHOOK_SECRET`.)

### Closing the loop (CRM → ad platforms)
Point your CRM's "deal stage changed" webhook at `POST /api/crm/stage` with the header `x-webhook-secret: $CRM_STAGE_WEBHOOK_SECRET`:

```json
{ "lead_id": "…", "stage": "appointment|qualified|won", "mobile": "+2010…", "email": "…", "gclid": "…", "vehicles": 40 }
```

- **Meta:** sent immediately as CAPI `Schedule` / `QualifiedLead` / `Purchase` with `action_source=system_generated` and value = vehicles × monthly fee.
- **Google Ads:** the response contains a `google_row` (gclid plus SHA-256 phone/email) ready for **Data Manager API** upload, the required path for offline and enhanced-conversions-for-leads imports from 15 June 2026. The upload itself needs an OAuth service account, so it is left to your data pipeline.

---

## Tracking

All browser events go to `dataLayer` and are mapped in GTM. Import `gtm/gtm-container.json` (Admin → Import container → **Merge**), then replace the `C - …` constant variables with real IDs. After import, review the tags: GTM import formats change, so check the Google Ads and enhanced-conversion tag settings by hand.

| Event | Fired when | Meta |
|---|---|---|
| `page_view` | load (locale, ab_variant) | PageView |
| `scroll_depth` | 25/50/75/90% | – |
| `cta_click` | any `[data-cta]` | – |
| `fleet_size_selected` | hero chip | custom `FleetSizeSelected` |
| `calculator_used` / `calculator_completed` | first input / result on screen | custom |
| `form_start`, `form_step_complete`, `form_error`, `form_abandon` | form lifecycle | – |
| `generate_lead` | thank-you page, **once per event_id** | **Lead** (Pixel + CAPI, same `event_id`) |
| `whatsapp_click`, `phone_click` | any `wa.me` / `tel:` link | **Contact** (Pixel + CAPI via `/api/event`) |
| `demo_booked` | Calendly / Cal.com embed callback | **Schedule** |
| `lang_switch` | toggle | – |

- **Consent:** Consent Mode v2 defaults are set inline in `<head>` before GTM. The default is `denied`; change `site.features.consentDefault` only if legal confirms. The choice is stored and sent with each lead. Server CAPI only sends user data when `ad_user_data` is granted. GTM loads on idle or first interaction to protect LCP and INP.
- **Attribution:** UTMs plus `gclid`, `gbraid`, `wbraid`, `fbclid`, `ttclid` and `li_fat_id` are stored first-touch and last-touch in the `pa_attr` cookie for 90 days. `_fbc` is synthesised from `fbclid` if the Pixel hasn't set it. Tracking params survive the language toggle.
- **Enhanced conversions:** `generate_lead` carries `user_data.email` and `user_data.phone_number` (E.164) for the Google tag to hash. They are removed from sessionStorage once fired.
- **Pre-launch:** check Meta Test Events (set `META_TEST_EVENT_CODE`) for a deduplicated Browser + Server Lead with EMQ ≥ 6, Google Tag Assistant, and GA4 DebugView.

### UTM conventions
```
utm_source   = facebook | instagram | google | linkedin | tiktok
utm_medium   = paid_social | cpc | email | organic_social
utm_campaign = eg_fleet_{objective}_{yyyymm}          e.g. eg_fleet_leads_202611
utm_content  = {ad_id}_{creative}                     Meta: {{ad.id}}_{{ad.name}}
utm_term     = keyword (search) | {{adset.name}} (Meta)
```

---

## RTL and bilingual rules (enforced)
- `<html lang dir>` is set per locale in `src/app/[locale]/layout.tsx`.
- `npm run lint:rtl` fails on physical-direction utilities.
- Directional icons are mirrored with `rtl:-scale-x-100`. The WhatsApp/phone icons, logos and checkmarks are not mirrored.
- Phones, numbers and amounts are wrapped in `<bdi>` / `dir="ltr"`. Phone inputs are `type="tel"`, `inputmode="tel"`, `dir="ltr"`, never `type="number"`. Arabic-Indic and Persian digits are converted to Western as the user types.
- Arabic body text is 17px with 1.75 line-height, never letter-spaced, italic or uppercased.

## Performance
- Static pages per locale × variant. The hero visual is HTML/CSS (no image), fonts are self-hosted with `next/font`, and there is no carousel or video above the fold. YouTube uses a click-to-load facade.
- First-load JS is about 157 KB gzip, of which about 103 KB is the shared Next/React runtime. To get under 150 KB, the next step is to stop shipping `next-intl` message formatting to the client (pass pre-formatted strings as props).

## Placeholders PetroApp must supply
`[WHATSAPP_E164]` · `[SALES_PHONE]` · `[HOURS]` · `[STATIONS_COUNT]` (site says 600+) · `[STATION_BRANDS]` · `[PRICE_FROM]` · `[EG_CLIENT_LOGOS]` (with permission; set `logo` paths in `config/site.ts`) · testimonials `[TESTIMONIAL_NAME/TITLE/QUOTE]` and case-study summaries in `messages/*.json → proof.cases` · `[VIDEO_URL]` · `[DASHBOARD_SCREENSHOT]` / `[NFC_PHOTO]` (the hero currently uses an HTML dashboard mock) · CRM webhook + field map · alert emails/Slack · `[BOOKING_URL]` · Meta Pixel/CAPI · Google Ads ID + labels · GA4 ID + API secret · GTM ID · Turnstile keys · `[DOMAIN]` · `[PRIVACY_POLICY_URL]` · `[LEGAL_ENTITY + CR/TAX_NO]` · **`[LEGAL_TO_CONFIRM]` PDPL consent wording** (`form.labels.consent_*`) · installation lead time (`site.stats.installDays`) · FAQ items marked `[CONFIRM]` (payment model, contract length, installation fee).

Grep for open items: `grep -rn "\[CONFIRM\]\|\[TESTIMONIAL\|\[CLIENT_\|\[BRAND_\|\[LEGAL" config messages`

## Launch checklist
See brief §11. These items are covered by the automated tests: phone validation (010/011/012/015, +20, 0020, Arabic-Indic, landline rejection), UTM survival through the toggle into the API payload, the thank-you token guard, single-fire conversion, both locales end to end, and no horizontal overflow at 360/1280 px. These still need doing by hand with real credentials: Meta/Google/GA4 verification, CRM owner/tier mapping, alert latency, real-device Safari/Samsung/Huawei checks, VoiceOver/TalkBack passes, and OG previews on WhatsApp/Facebook/LinkedIn.
