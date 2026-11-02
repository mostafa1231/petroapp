import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { site } from "@config/site";
import { formatEgMobileNational } from "@/lib/phone";
import { formatEgp, formatNumber } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import { MultiStepForm } from "./form/MultiStepForm";
import { Calculator } from "./Calculator";
import { CaseStudies } from "./CaseStudies";
import { LiteYouTube } from "./LiteYouTube";
import { OpenFormButton } from "./OpenFormButton";
import {
  CashIcon,
  ChartIcon,
  CheckIcon,
  FileIcon,
  FuelIcon,
  NfcIcon,
  PhoneAppIcon,
  PhoneIcon,
  PinIcon,
  PlugIcon,
  ReceiptIcon,
  ShieldIcon,
  SlidersIcon,
  TrendIcon,
  WhatsAppIcon,
  XIcon,
} from "./Icons";

type L = "ar" | "en";
type Item = { title: string; body: string };

/* ---------------------------------- Hero ---------------------------------- */

export async function Hero({ locale, variant }: { locale: L; variant: string }) {
  const t = await getTranslations("hero");
  const tw = await getTranslations("wa");
  const h1Key = variant === "B" ? "h1.B" : "h1.A";
  return (
    <section id="top" data-section="hero" className="bg-gradient-to-b from-brand-50 to-white">
      <div className="container-x pb-10 pt-4 md:pt-10 lg:pb-16">
        <div className="max-w-4xl">
          <p className="inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand ring-1 ring-brand-100">
            {t("eyebrow", { stations: site.stats.stationsCount })}
          </p>
          <h1 className="mt-3 text-[1.75rem] leading-snug sm:text-5xl sm:leading-tight lg:text-[3.5rem]" data-testid="hero-h1">
            {t(h1Key, { pct: site.claims.egyptSavingPct })}
          </h1>
          <p className="mt-2 text-base text-muted sm:mt-4 sm:text-xl lg:text-2xl lg:leading-relaxed">{t("sub")}</p>
          <div className="mt-6 hidden flex-wrap gap-3 lg:flex">
            <ContactButtons locale={locale} wa={tw("default")} waLabel={t("whatsapp")} callLabel={t("call")} />
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:mt-10 lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col">
            <MultiStepForm intent="hero" variant={variant} primary className="lg:flex-1" />
            <div className="mt-4 flex flex-wrap gap-3 lg:hidden">
              <ContactButtons locale={locale} wa={tw("default")} waLabel={t("whatsapp")} callLabel={t("call")} />
            </div>
          </div>
          <div className="hidden lg:block">
            <DashboardMock locale={locale} />
          </div>
        </div>
      </div>

      <div className="container-x pb-10">
        <p className="text-center font-semibold">
          {t("trust", { companies: site.stats.companies, vehicles: site.stats.vehicles, countries: site.stats.countries })}
        </p>
        <LogoStrip label={t("logosLabel")} />
        <div className="mt-8 lg:hidden">
          <DashboardMock locale={locale} />
        </div>
      </div>
    </section>
  );
}

function ContactButtons({ wa, waLabel, callLabel }: { locale: L; wa: string; waLabel: string; callLabel: string }) {
  return (
    <>
      <a href={whatsappLink(wa)} target="_blank" rel="noopener" data-loc="hero" className="btn btn-wa flex-1 sm:flex-none">
        <WhatsAppIcon className="size-5" />
        {waLabel}
      </a>
      <a href={`tel:${site.contact.salesPhoneE164}`} data-loc="hero" className="btn btn-ghost flex-1 sm:flex-none">
        <PhoneIcon className="size-5" />
        {callLabel}
      </a>
    </>
  );
}

function LogoStrip({ label }: { label: string }) {
  return (
    <ul aria-label={label} className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {site.clientLogos.map((c) => (
        <li key={c.name} className="flex h-14 items-center justify-center rounded-xl border border-line bg-white px-2 text-center text-xs font-semibold text-muted">
          {c.logo ? <Image src={c.logo} alt={c.name} width={120} height={40} className="max-h-9 w-auto grayscale" /> : <span lang="en">{c.name}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Arabic dashboard mock in HTML/CSS — no image request, crisp at any DPR. Replace with [DASHBOARD_SCREENSHOT] when ready. */
async function DashboardMock({ locale }: { locale: L }) {
  const t = await getTranslations("hero.mock");
  const bars = [62, 48, 70, 55, 80, 44, 66];
  return (
    <figure aria-hidden className="card flex h-full flex-col overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <span className="font-bold">{t("title")}</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ok">
          <span className="size-2 rounded-full bg-ok" />
          {t("live")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="col-span-2 rounded-xl bg-brand-50 p-3">
          <p className="text-xs text-muted">{t("spend")}</p>
          <p className="text-lg font-bold">
            <bdi>{formatEgp(846_300, locale)}</bdi>
          </p>
          <div className="mt-2 flex h-14 items-end gap-1.5">
            {bars.map((h, i) => (
              <span key={i} className="flex-1 rounded-t bg-brand" style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-[#eaf7ef] p-3">
            <p className="text-xs text-muted">{t("saved")}</p>
            <p className="text-lg font-bold text-ok">
              <bdi>{formatNumber(18, locale)}%</bdi>
            </p>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <p className="text-lg font-bold">
              <bdi>{formatNumber(42, locale)}</bdi>
            </p>
            <p className="text-xs text-muted">{t("vehicles")}</p>
          </div>
        </div>
      </div>
      <ul className="space-y-2 px-4 pb-4 text-sm">
        {[
          { label: t("tx1"), plate: "ن ق ط 4821", ok: true },
          { label: t("tx2"), plate: "ب س م 1937", ok: true },
          { label: t("tx3"), plate: "ع ر ص 5520", ok: false },
        ].map((r) => (
          <li key={r.plate} className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
            <span className="flex items-center gap-2">
              <span className={`flex size-7 items-center justify-center rounded-full ${r.ok ? "bg-brand-50 text-brand" : "bg-red-50 text-danger"}`}>
                {r.ok ? <NfcIcon className="size-4" /> : <XIcon className="size-4" />}
              </span>
              {r.label}
            </span>
            <span className={r.ok ? "text-muted" : "font-semibold text-danger"}>{r.ok ? <bdi>{r.plate}</bdi> : t("blocked")}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ---------------------------------- Pain ---------------------------------- */

export async function Pain() {
  const t = await getTranslations("pain");
  const items = t.raw("items") as Item[];
  const icons = [ReceiptIcon, CashIcon, TrendIcon, FileIcon];
  return (
    <section className="section bg-white" data-section="pain">
      <div className="container-x">
        <h2 className="section-title text-center">{t("title")}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => {
            const Icon = icons[i];
            return (
              <div key={it.title} className="card p-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-danger">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-3 text-lg">{it.title}</h3>
                <p className="mt-1 text-muted">{it.body}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-center text-xl font-bold text-brand sm:text-2xl">{t("closing")}</p>
      </div>
    </section>
  );
}

/* ------------------------------ How it works ------------------------------ */

export async function HowItWorks() {
  const t = await getTranslations("how");
  const steps = t.raw("steps") as Item[];
  const icons = [NfcIcon, SlidersIcon, FuelIcon];
  return (
    <section className="section bg-surface" data-section="how">
      <div className="container-x">
        <h2 className="section-title text-center">{t("title")}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = icons[i];
            return (
              <li key={s.title} className="card relative p-5">
                <span className="absolute end-4 top-4 text-4xl font-bold text-brand-100">{i + 1}</span>
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-white">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-3 text-lg">{s.title}</h3>
                <p className="mt-1 text-muted">{s.body}</p>
              </li>
            );
          })}
        </ol>
        {site.media.videoYoutubeId && (
          <div className="mx-auto mt-8 max-w-3xl">
            <LiteYouTube id={site.media.videoYoutubeId} title={t("video")} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------- Calculator ------------------------------- */

export async function CalculatorSection() {
  const t = await getTranslations("calc");
  return (
    <section id="calculator" className="section bg-white" data-section="calculator">
      <div className="container-x">
        <h2 className="section-title text-center">{t("title")}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted">{t("sub")}</p>
        <div className="mt-8">
          <Calculator />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Features -------------------------------- */

export async function Features() {
  const t = await getTranslations("features");
  const items = t.raw("items") as Item[];
  const icons = [SlidersIcon, ChartIcon, FileIcon, PinIcon, PlugIcon, PhoneAppIcon];
  return (
    <section className="section bg-surface" data-section="features">
      <div className="container-x">
        <h2 className="section-title text-center">{t("title")}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((_, i) => {
            const Icon = icons[i];
            return (
              <div key={i} className="card p-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-3 text-lg">{t(`items.${i}.title`)}</h3>
                <p className="mt-1 text-muted">{t(`items.${i}.body`, { stations: site.stats.stationsCount })}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Social proof ------------------------------ */

export async function Proof() {
  const t = await getTranslations("proof");
  return (
    <section className="section bg-white" data-section="proof">
      <div className="container-x">
        <h2 className="section-title text-center">{t("title")}</h2>
        <div className="mt-8">
          <CaseStudies />
        </div>
        <h3 className="mt-12 text-center text-lg text-muted">{t("logosTitle")}</h3>
        <LogoStrip label={t("logosTitle")} />
        <p className="mt-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand">
            <ShieldIcon className="size-4" />
            {t("funding")}
          </span>
        </p>
      </div>
    </section>
  );
}

/* ----------------------------- Pricing teaser ----------------------------- */

export async function PricingTeaser() {
  if (!site.pricing.showTeaser) return null;
  const t = await getTranslations("pricing");
  return (
    <section className="bg-white pb-14" data-section="pricing">
      <div className="container-x">
        <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border-2 border-brand-100 bg-brand-50 p-6 text-center md:flex-row md:justify-between md:text-start">
          <div>
            <p className="text-2xl font-bold text-brand">{t("title", { price: site.pricing.priceFromEgpPerVehicleMonth })}</p>
            <p className="mt-1 text-muted">{t("body")}</p>
          </div>
          <OpenFormButton intent="pricing" cta="pricing_teaser" className="btn btn-primary shrink-0">
            {t("cta")}
          </OpenFormButton>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Comparison ------------------------------- */

export async function Comparison() {
  const t = await getTranslations("compare");
  const rows = t.raw("rows") as { label: string; old: string; new: string }[];
  return (
    <section className="section bg-surface" data-section="compare">
      <div className="container-x max-w-4xl">
        <h2 className="section-title text-center">{t("title")}</h2>
        <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
          <table className="w-full text-start text-sm sm:text-base">
            <thead>
              <tr className="bg-brand text-white">
                <th scope="col" className="p-3 text-start">
                  <span className="sr-only">—</span>
                </th>
                <th scope="col" className="p-3 text-start font-semibold">
                  {t("colOld")}
                </th>
                <th scope="col" className="p-3 text-start font-semibold">
                  {t("colNew")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-line align-top">
                  <th scope="row" className="p-3 text-start font-bold">
                    {r.label}
                  </th>
                  <td className="p-3 text-muted">
                    <span className="flex gap-2">
                      <XIcon className="mt-1 size-4 shrink-0 text-danger" />
                      {r.old}
                    </span>
                  </td>
                  <td className="p-3 font-semibold">
                    <span className="flex gap-2">
                      <CheckIcon className="mt-1 size-4 shrink-0 text-ok" />
                      {r.new}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- FAQ ---------------------------------- */

export async function Faq() {
  const t = await getTranslations("faq");
  const count = (t.raw("items") as unknown[]).length;
  const vars = { stations: site.stats.stationsCount, days: site.stats.installDays };
  const items = Array.from({ length: count }, (_, i) => ({ q: t(`items.${i}.q`, vars), a: t(`items.${i}.a`, vars) }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
  };
  return (
    <section className="section bg-white" data-section="faq">
      <div className="container-x max-w-3xl">
        <h2 className="section-title text-center">{t("title")}</h2>
        <div className="mt-8 divide-y divide-line rounded-[var(--radius-card)] border border-line">
          {items.map((it) => (
            <details key={it.q} className="group px-4">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                {it.q}
                <span aria-hidden className="text-2xl leading-none text-brand transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-4 text-muted">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}

/* -------------------------------- Final CTA ------------------------------- */

export async function FinalCta({ variant }: { variant: string }) {
  const t = await getTranslations("finalCta");
  const th = await getTranslations("hero");
  const tw = await getTranslations("wa");
  return (
    <section id="lead-section" className="section bg-brand-50" data-section="final_cta" aria-labelledby="lead-section-title">
      <div className="container-x max-w-2xl">
        <div className="text-center">
          <p className="inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand ring-1 ring-brand-100">{t("eyebrow")}</p>
          <h2 id="lead-section-title" className="section-title mt-3">
            {t("title")}
          </h2>
          <p className="mt-2 text-muted sm:text-lg">{t("sub")}</p>
        </div>
        <div className="mt-8">
          <MultiStepForm intent="final_cta" variant={variant} />
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a href={whatsappLink(tw("default"))} target="_blank" rel="noopener" data-loc="final_cta" className="btn btn-wa flex-1 sm:flex-none">
            <WhatsAppIcon className="size-5" />
            {th("whatsapp")}
          </a>
          <a href={`tel:${site.contact.salesPhoneE164}`} data-loc="final_cta" className="btn btn-ghost flex-1 sm:flex-none">
            <PhoneIcon className="size-5" />
            {th("call")}
          </a>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Footer --------------------------------- */

export async function Footer({ locale }: { locale: L }) {
  const t = await getTranslations("footer");
  return (
    <footer className="bg-ink pb-24 pt-10 text-white/80 md:pb-10" data-section="footer">
      <div className="container-x flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-sm">
          <Image src="/brand/petroapp-logo-white.png" alt="PetroApp" width={130} height={29} className="mb-3 h-7 w-auto" />
          <p>{site.legal.entity}</p>
          <p>{site.contact.address[locale]}</p>
          <p>
            {t("cr")}: <bdi>{site.legal.crNumber}</bdi> · {t("tax")}: <bdi>{site.legal.taxNumber}</bdi>
          </p>
          <p>
            <a href={`tel:${site.contact.salesPhoneE164}`} data-loc="footer" className="underline">
              <bdi dir="ltr">{formatEgMobileNational(site.contact.salesPhoneE164)}</bdi>
            </a>{" "}
            · {site.contact.hours[locale]}
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm md:items-end">
          <div className="flex gap-4">
            {Object.entries(site.social).map(([k, href]) => (
              <a key={k} href={href} target="_blank" rel="noopener" className="capitalize underline">
                {k}
              </a>
            ))}
          </div>
          <a href={site.legal.privacyPolicyUrl} className="underline">
            {t("privacy")}
          </a>
          <p>
            © {new Date().getFullYear()} PetroApp · {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
