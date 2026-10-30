import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { experiment, isVariant } from "@config/experiments";
import { isLocale, routing } from "@/i18n/routing";
import { ClientBoot } from "@/components/ClientBoot";
import { ExitIntent } from "@/components/ExitIntent";
import { Header } from "@/components/Header";
import { StickyMobileBar } from "@/components/StickyMobileBar";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import {
  CalculatorSection,
  Comparison,
  Faq,
  Features,
  FinalCta,
  Footer,
  Hero,
  HowItWorks,
  Pain,
  PricingTeaser,
  Proof,
} from "@/components/Sections";

/**
 * Served at /ar and /en via middleware rewrite (sticky A/B cookie).
 * Direct /<locale>/v/<variant> URLs get X-Robots-Tag: noindex (next.config).
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => experiment.variants.map((variant) => ({ locale, variant })));
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string; variant: string }> }) {
  const { locale, variant } = await params;
  if (!isLocale(locale) || !isVariant(variant)) notFound();
  setRequestLocale(locale);

  return (
    <>
      <a href="#lead-form" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
        {locale === "ar" ? "انتقل إلى النموذج" : "Skip to form"}
      </a>
      <Header locale={locale} />
      <main data-variant={variant}>
        <Hero locale={locale} variant={variant} />
        <Pain />
        <HowItWorks />
        <CalculatorSection />
        <Features />
        <Proof />
        <PricingTeaser />
        <Comparison />
        <Faq />
        <FinalCta variant={variant} />
      </main>
      <Footer locale={locale} />
      <StickyMobileBar />
      <WhatsAppFab />
      <ExitIntent />
      <ClientBoot locale={locale} variant={variant} />
    </>
  );
}
