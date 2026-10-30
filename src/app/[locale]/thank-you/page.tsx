import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { site } from "@config/site";
import { isLocale } from "@/i18n/routing";
import { verifyLeadToken } from "@/lib/token";
import { TIER_SLA_MINUTES } from "@/lib/scoring";
import { whatsappLink } from "@/lib/whatsapp";
import { ClientBoot } from "@/components/ClientBoot";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Sections";
import { CheckIcon, WhatsAppIcon } from "@/components/Icons";
import { ThankYouClient } from "@/components/ThankYouClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "thanks" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function ThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale } = await params;
  const { t: token } = await searchParams;
  if (!isLocale(locale)) redirect("/ar");
  const lead = verifyLeadToken(token);
  if (!lead) redirect(`/${locale}`);
  setRequestLocale(locale);

  const t = await getTranslations("thanks");
  const tw = await getTranslations("wa");
  const ref = lead.lid.slice(0, 8).toUpperCase();
  const minutes = TIER_SLA_MINUTES[lead.tier] ?? site.stats.responseMinutes;
  const steps = [
    t("steps.0", { minutes: Math.max(minutes, 5) }),
    t("steps.1"),
    t("steps.2", { days: site.stats.installDays }),
  ];

  return (
    <>
      <Header locale={locale} path="/thank-you" />
      <main className="bg-gradient-to-b from-brand-50 to-white" data-section="thank_you">
        <div className="container-x max-w-3xl py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl" data-testid="thanks-title">
            {t("title", { name: lead.fn })}
          </h1>
          <p className="mt-2 text-muted">
            {t("ref")}: <bdi className="font-mono font-semibold text-ink">{ref}</bdi>
          </p>

          <a
            href={whatsappLink(tw("thanks", { ref }))}
            target="_blank"
            rel="noopener"
            data-loc="thank_you"
            className="btn btn-wa-solid mt-6 w-full text-lg sm:w-auto"
          >
            <WhatsAppIcon className="size-6" />
            {t("whatsapp")}
          </a>

          <section className="card mt-8 p-5 sm:p-6">
            <h2 className="text-xl">{t("nextTitle")}</h2>
            <ol className="mt-4 space-y-4">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white">{i + 1}</span>
                  <span className="pt-1">{s}</span>
                </li>
              ))}
            </ol>
          </section>

          <ThankYouClient
            eventId={lead.eid}
            tier={lead.tier}
            bookingUrl={lead.tier !== "C" ? site.media.bookingUrl : ""}
            locale={locale}
            videoId={site.media.videoYoutubeId}
          />

          <p className="mt-10">
            <a href={`/${locale}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline">
              <CheckIcon className="size-4" />
              {t("back")}
            </a>
          </p>
        </div>
      </main>
      <Footer locale={locale} />
      <ClientBoot locale={locale} pageType="thank_you" />
    </>
  );
}
