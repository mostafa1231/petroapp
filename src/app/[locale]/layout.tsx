import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { site } from "@config/site";
import { isLocale, routing } from "@/i18n/routing";
import { ConsentBanner } from "@/components/ConsentBanner";

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-plex",
  preload: true,
});
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: site.themeColor, width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("title");
  const description = t("description", { stations: site.stats.stationsCount });
  return {
    metadataBase: new URL(site.domain),
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: { "ar-EG": "/ar", "en-EG": "/en", "x-default": "/ar" },
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/${locale}`,
      siteName: "PetroApp",
      locale: locale === "ar" ? "ar_EG" : "en_EG",
      alternateLocale: locale === "ar" ? "en_EG" : "ar_EG",
      images: [{ url: `/og/og-${locale}.png`, width: 1200, height: 630, alt: t("ogAlt") }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`/og/og-${locale}.png`] },
    icons: { icon: "/favicon.svg" },
    robots: { index: true, follow: true },
  };
}

/** Consent Mode v2 defaults + stored choice, then GTM on idle. Runs before any tag. */
function headScript(gtmId: string | undefined) {
  const def = site.features.consentDefault;
  return `
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'${def}',analytics_storage:'${def}',ad_user_data:'${def}',ad_personalization:'${def}',wait_for_update:500});
gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',true);
try{var c=JSON.parse(localStorage.getItem('pa_consent')||'null');if(c){gtag('consent','update',c);}}catch(e){}
${
  gtmId
    ? `(function(){function l(){if(window.__gtm)return;window.__gtm=1;dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtm.js?id=${gtmId}';document.head.appendChild(s);}
if('requestIdleCallback' in window){requestIdleCallback(l,{timeout:3500});}else{setTimeout(l,2500);}
['pointerdown','keydown','scroll'].forEach(function(e){addEventListener(e,l,{once:true,passive:true});});})();`
    : ""
}`;
}

function orgJsonLd(locale: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.domain}/#org`,
        name: "PetroApp",
        url: site.domain,
        logo: `${site.domain}/brand/petroapp-logo.png`,
        sameAs: Object.values(site.social),
        contactPoint: {
          "@type": "ContactPoint",
          telephone: site.contact.salesPhoneE164,
          contactType: "sales",
          areaServed: "EG",
          availableLanguage: ["ar", "en"],
        },
      },
      {
        "@type": "LocalBusiness",
        "@id": `${site.domain}/#eg`,
        name: locale === "ar" ? "بتروآب مصر" : "PetroApp Egypt",
        image: `${site.domain}/brand/petroapp-logo.png`,
        telephone: site.contact.salesPhoneE164,
        address: {
          "@type": "PostalAddress",
          streetAddress: site.contact.address[locale === "ar" ? "ar" : "en"],
          addressLocality: "Cairo",
          addressCountry: "EG",
        },
        parentOrganization: { "@id": `${site.domain}/#org` },
      },
    ],
  };
}

/** Only namespaces used by client components are shipped to the browser. */
const CLIENT_NAMESPACES = ["header", "form", "options", "calc", "sticky", "exit", "consent", "wa", "thanks", "proof"] as const;

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const all = await getMessages();
  const messages = Object.fromEntries(CLIENT_NAMESPACES.map((k) => [k, all[k]]));
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${plex.variable} ${inter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript(gtmId) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd(locale)) }} />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <ConsentBanner />
        </NextIntlClientProvider>
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="gtm"
            />
          </noscript>
        )}
      </body>
    </html>
  );
}
