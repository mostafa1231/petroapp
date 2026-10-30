import * as z from "zod/v4-mini";
import {
  CURRENT_METHODS,
  FLEET_SIZES,
  GOVERNORATES,
  INDUSTRIES,
  JOB_ROLES,
  LEAD_INTENTS,
  PREFERRED_CONTACT,
  SPEND_BANDS,
  VEHICLE_TYPES,
} from "./options";
import { isEgMobile } from "./phone";

/**
 * Shared between the client form (React Hook Form) and POST /api/lead.
 * Uses zod/v4-mini to keep the client bundle small.
 * Error messages are i18n keys under `form.errors.*`.
 */

const required = { error: "required" };
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const nameRe = /^[\p{L}\p{M}\s.'&\-()0-9]+$/u;
const minTrim = (n: number, msg: string) => z.refine<string>((v) => v.trim().length >= n, msg);
const emptyOr = <T extends z.ZodMiniType>(s: T) => z.optional(z.union([s, z.literal("")]));

const step1Shape = {
  fleet_size: z.enum(FLEET_SIZES, required),
};

const step2Shape = {
  vehicle_types: z.optional(z.array(z.enum(VEHICLE_TYPES))),
  monthly_fuel_spend: z.enum(SPEND_BANDS, required),
  current_method: z.enum(CURRENT_METHODS, required),
  governorate: z.enum(GOVERNORATES, required),
};

const step3Shape = {
  company_name: z.string(required).check(minTrim(2, "company_min"), z.maxLength(100, "too_long"), z.regex(nameRe, "invalid_chars")),
  job_role: z.enum(JOB_ROLES, required),
  industry: emptyOr(z.enum(INDUSTRIES)),
};

const step4Shape = {
  full_name: z.string(required).check(minTrim(2, "name_min"), z.maxLength(60, "too_long"), z.regex(nameRe, "invalid_chars")),
  mobile: z.string(required).check(minTrim(1, "required"), z.refine<string>(isEgMobile, "mobile_invalid")),
  whatsapp_same: z.optional(z.boolean()),
  whatsapp_number: z.optional(z.string()),
  email: z.optional(
    z.string().check(
      z.maxLength(120, "too_long"),
      z.refine<string>((v) => v === "" || emailRe.test(v.trim()), "email_invalid"),
    ),
  ),
  preferred_contact: emptyOr(z.enum(PREFERRED_CONTACT)),
  consent_processing: z.literal(true, { error: "consent_required" }),
  consent_marketing: z.optional(z.boolean()),
};

const whatsappCheck = z.refine<{ whatsapp_same?: boolean; whatsapp_number?: string }>(
  (v) => v.whatsapp_same !== false || (!!v.whatsapp_number && isEgMobile(v.whatsapp_number)),
  { error: "mobile_invalid", path: ["whatsapp_number"] },
);

export const step1Schema = z.object(step1Shape);
export const step2Schema = z.object(step2Shape);
export const step3Schema = z.object(step3Shape);
export const step4Schema = z.object(step4Shape).check(whatsappCheck);

export const leadFormSchema = z.object({ ...step1Shape, ...step2Shape, ...step3Shape, ...step4Shape }).check(whatsappCheck);

export type LeadFormValues = z.input<typeof leadFormSchema>;
export type LeadFormOutput = z.output<typeof leadFormSchema>;

export const STEP_FIELDS = [
  ["fleet_size"],
  ["vehicle_types", "monthly_fuel_spend", "current_method", "governorate"],
  ["company_name", "job_role", "industry"],
  [
    "full_name",
    "mobile",
    "whatsapp_same",
    "whatsapp_number",
    "email",
    "preferred_contact",
    "consent_processing",
    "consent_marketing",
  ],
] as const satisfies readonly (readonly (keyof LeadFormValues)[])[];

export const STEP_SCHEMAS = [step1Schema, step2Schema, step3Schema, step4Schema] as const;

const str = (max = 500) => z.optional(z.string().check(z.maxLength(max)));
const granted = z.enum(["granted", "denied"]);

export const attributionSchema = z.object({
  utm_source: str(200),
  utm_medium: str(200),
  utm_campaign: str(200),
  utm_content: str(200),
  utm_term: str(200),
  utm_id: str(200),
  gclid: str(),
  gbraid: str(),
  wbraid: str(),
  fbclid: str(),
  ttclid: str(),
  li_fat_id: str(),
  landing_page_url: str(2000),
  referrer: str(2000),
  ts: z.optional(z.number()),
});

export const calculatorPayloadSchema = z.object({
  vehicles: z.optional(z.number()),
  fuel_type: str(10),
  litres: z.optional(z.number()),
  waste_pct: z.optional(z.number()),
  est_spend: z.optional(z.number()),
  est_saving: z.optional(z.number()),
});

export const consentStateSchema = z.object({
  ad_storage: granted,
  analytics_storage: granted,
  ad_user_data: granted,
  ad_personalization: granted,
});
export type ConsentState = z.infer<typeof consentStateSchema>;

/** Hidden/context fields added by the client at submit time. */
export const leadMetaSchema = z.object({
  event_id: z.uuid(),
  client_id: str(100),
  started_at: z.int(),
  page_locale: z.enum(["ar", "en"]),
  ab_variant: str(20),
  lead_intent: z._default(z.enum(LEAD_INTENTS), "hero"),
  device_type: z.optional(z.enum(["mobile", "tablet", "desktop"])),
  landing_page_url: str(2000),
  referrer: str(2000),
  first_touch: z.optional(attributionSchema),
  last_touch: z.optional(attributionSchema),
  fbp: str(200),
  fbc: str(500),
  calculator_payload: z.optional(calculatorPayloadSchema),
  consent_state: z.optional(consentStateSchema),
  turnstile_token: str(4000),
  /** Honeypot — any value marks the submission as a bot. */
  website: str(500),
});

export const leadApiSchema = z.object({
  lead: leadFormSchema,
  meta: leadMetaSchema,
});
export type LeadApiPayload = z.output<typeof leadApiSchema>;
