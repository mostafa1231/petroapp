/**
 * Single source of truth for numbers, prices, claims and contact details.
 * Marketing edits this file (and messages/*.json) — never the components.
 * Values in [BRACKETS] or marked CONFIRM must be supplied/verified by PetroApp.
 */

export type FuelType = "95" | "92" | "80" | "diesel" | "cng";

export const site = {
  brand: "PetroApp",
  domain: process.env.NEXT_PUBLIC_SITE_URL ?? "https://eg.petroapp.com", // [DOMAIN]
  themeColor: "#1B6AE4",

  contact: {
    // Old Egypt site uses 01222244141 — CONFIRM it is the sales line.
    whatsappE164: process.env.NEXT_PUBLIC_WHATSAPP_E164 ?? "+201222244141", // [WHATSAPP_E164]
    salesPhoneE164: process.env.NEXT_PUBLIC_SALES_PHONE_E164 ?? "+201222244141", // [SALES_PHONE]
    hours: { ar: "متاحين من 9 ص لـ 6 م", en: "Available 9am–6pm" }, // [HOURS]
    address: {
      ar: "زهراء المعادي، القاهرة",
      en: "Zahraa El Maadi, Cairo",
    },
  },

  legal: {
    entity: "[LEGAL_ENTITY]",
    crNumber: "[CR_NO]",
    taxNumber: "[TAX_NO]",
    privacyPolicyUrl: process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL ?? "https://petroapp.com/privacy", // [PRIVACY_POLICY_URL]
  },

  stats: {
    stationsCount: "600", // [STATIONS_COUNT] — old site says 600+; CONFIRM
    companies: "10,000",
    vehicles: "500,000",
    countries: 4,
    installDays: 3, // [X days] installation lead time — CONFIRM
    responseMinutes: 15,
  },

  claims: {
    egyptSavingPct: 20, // conservative, backed by Egyptian case studies
    calculatorMaxWastePct: 35, // upper bound only, never a headline
  },

  /** EGP per litre (CNG per m³). Update after every quarterly pricing committee. */
  fuelPrices: {
    label: { ar: "أسعار مارس 2026", en: "March 2026 prices" },
    prices: {
      "95": 24,
      "92": 22.25,
      "80": 20.75,
      diesel: 20.5,
      cng: 10, // CONFIRM current natural-gas price per m³
    } satisfies Record<FuelType, number>,
  },

  calculator: {
    defaultVehicles: 20,
    defaultFuel: "92" as FuelType,
    defaultLitresPerVehicle: 400,
    waste: { min: 10, max: 35, default: 15 },
  },

  pricing: {
    showTeaser: true, // A/B test variable
    priceFromEgpPerVehicleMonth: 30, // [PRICE_FROM] — old site Elite tier; CONFIRM
    /** Used for conversion value = vehicles × monthly fee. */
    avgMonthlyFeePerVehicle: 40, // CONFIRM
  },

  /** Western digits by default; flip to test Arabic-Indic numerals. */
  numerals: { arabicIndic: false },

  features: {
    exitIntent: true,
    /** Send phone on form_abandon — keep off until legal confirms (PDPL). */
    partialLeadCapture: false,
    /** "granted" only if legal confirms Egyptian law allows default-on. */
    consentDefault: "denied" as "denied" | "granted",
  },

  media: {
    videoYoutubeId: process.env.NEXT_PUBLIC_VIDEO_YOUTUBE_ID ?? "", // [VIDEO_URL]
    bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL ?? "", // [BOOKING_URL]
  },

  /** [EG_CLIENT_LOGOS] — replace `logo` with /public paths once permission is granted. */
  clientLogos: [
    { name: "J&T Express", logo: "" },
    { name: "Target Egypt Group", logo: "" },
    { name: "Cairo Airport Travel", logo: "" },
    { name: "Roboost", logo: "" },
    { name: "[CLIENT_5]", logo: "" },
    { name: "[CLIENT_6]", logo: "" },
  ],

  /** [STATION_BRANDS] */
  stationBrands: ["[BRAND_1]", "[BRAND_2]", "[BRAND_3]", "[BRAND_4]"],

  social: {
    facebook: "https://www.facebook.com/petroapp",
    linkedin: "https://www.linkedin.com/company/petroapp",
    instagram: "https://www.instagram.com/petroapp",
  },
} as const;

export const whatsappNumberNoPlus = site.contact.whatsappE164.replace(/^\+/, "");
