"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Controller, useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { site } from "@config/site";
import { draftStore, useDraft } from "@/lib/draft-store";
import {
  CURRENT_METHODS,
  CUSTOMER_TYPES,
  FLEET_SIZES,
  GOVERNORATES,
  INDUSTRIES,
  JOB_ROLES,
  PREFERRED_CONTACT,
  SPEND_BANDS,
  VEHICLE_TYPES,
  type LeadIntent,
} from "@/lib/options";
import { leadFormSchema, STEP_FIELDS, STEP_SCHEMAS, type LeadFormValues } from "@/lib/schema";
import { normalizeEgMobile, toWesternDigits } from "@/lib/phone";
import { readAttribution, readCookie } from "@/lib/attribution";
import { deviceType, gaClientId, readConsentState, track, uuid } from "@/lib/tracking";
import { whatsappLink } from "@/lib/whatsapp";
import { LAST_LEAD_KEY, QUEUE_KEY } from "@/lib/keys";
import { ChipGroup } from "./ChipGroup";
import { Turnstile } from "./Turnstile";

const TOTAL = 5;
const DEFAULTS: Partial<LeadFormValues> = {
  vehicle_types: [],
  whatsapp_same: true,
  consent_processing: undefined,
  consent_marketing: false,
  email: "",
  industry: "",
  preferred_contact: "",
  whatsapp_number: "",
  governorate: "" as never,
};

type Status = "idle" | "sending" | "network" | "rate" | "error";

export function MultiStepForm({
  intent,
  variant,
  primary = false,
}: {
  intent: LeadIntent;
  variant: string;
  primary?: boolean;
}) {
  const t = useTranslations("form");
  const tl = useTranslations("form.labels");
  const te = useTranslations("form.errors");
  const to = useTranslations("options");
  const tw = useTranslations("wa");
  const locale = useLocale() as "ar" | "en";
  const router = useRouter();
  const uid = useId().replace(/:/g, "");
  const draft = useDraft();
  const step = Math.min(draft.step, TOTAL - 1);
  const stepRef = useRef(step);
  stepRef.current = step;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const turnstileToken = useRef("");
  const submitted = useRef(false);
  const firstRender = useRef(true);

  const resolver: Resolver<LeadFormValues> = (values, ctx, opts) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zodResolver(STEP_SCHEMAS[stepRef.current] as any, undefined, { raw: true })(values, ctx, opts as any) as any;

  const {
    control,
    register,
    handleSubmit,
    trigger,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver,
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { ...DEFAULTS, ...draftStore.get().values },
  });

  // Hydrate from sessionStorage after mount (SSR renders empty).
  useEffect(() => {
    reset({ ...DEFAULTS, ...draftStore.get().values, ...pickConsent(getValues()) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This instance → store (skipped while applying a change that came from the store).
  const applyingExternal = useRef(false);
  useEffect(() => {
    const sub = watch((v) => {
      if (!applyingExternal.current) draftStore.setValues(withoutConsent(v as Partial<LeadFormValues>), uid);
    });
    return () => sub.unsubscribe();
  }, [watch, uid]);

  // Other instance / calculator → this instance.
  const lastRev = useRef(-1);
  useEffect(
    () =>
      draftStore.subscribe(() => {
        const d = draftStore.get();
        if (d.rev === lastRev.current || !d.source || d.source === uid) return;
        lastRev.current = d.rev;
        if (JSON.stringify(withoutConsent(getValues())) === JSON.stringify({ ...DEFAULTS, ...withoutConsent(d.values) })) return;
        applyingExternal.current = true;
        reset({ ...DEFAULTS, ...d.values, ...pickConsent(getValues()) }, { keepErrors: true });
        applyingExternal.current = false;
      }),
    [reset, getValues, uid],
  );

  // Focus the step heading on step change (not on first paint).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (draft.source === uid || draft.source === "external") headingRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // form_abandon on leave.
  useEffect(() => {
    if (!primary) return;
    const onHide = () => {
      const d = draftStore.get();
      if (d.startedAt && !submitted.current) {
        track("form_abandon", { last_step: d.step + 1, lead_intent: d.intent });
      }
    };
    addEventListener("pagehide", onHide);
    return () => removeEventListener("pagehide", onHide);
  }, [primary]);

  function markStarted() {
    if (draftStore.start(intent)) track("form_start", { lead_intent: draftStore.get().intent });
  }

  function reportErrors(errs: FieldErrors<LeadFormValues>) {
    for (const field of Object.keys(errs)) track("form_error", { field, step: stepRef.current + 1 });
  }

  async function next() {
    markStarted();
    const ok = await trigger(STEP_FIELDS[step] as unknown as (keyof LeadFormValues)[], { shouldFocus: true });
    if (!ok) {
      // Errors object updates after trigger resolves.
      queueMicrotask(() => reportErrors(errorsRef.current));
      return;
    }
    track("form_step_complete", { step_number: step + 1 });
    draftStore.setStep(step + 1, uid);
  }
  const errorsRef = useRef(errors);
  errorsRef.current = errors;

  function back() {
    draftStore.setStep(Math.max(0, step - 1), uid);
  }

  function onFleetPicked(v: string) {
    markStarted();
    setValue("fleet_size", v as LeadFormValues["fleet_size"], { shouldValidate: true });
    track("fleet_size_selected", { fleet_size: v });
    track("form_step_complete", { step_number: 2 });
    draftStore.setStep(2, uid);
  }

  function onCustomerTypePicked(v: string) {
    markStarted();
    setValue("customer_type", v as never, { shouldValidate: false });
    track("customer_type_selected", { customer_type: v });
    if (v === "personal") {
      track("disqualified_personal", { lead_intent: draftStore.get().intent });
      return; // stays on step 0; the stop panel replaces the question
    }
    track("form_step_complete", { step_number: 1 });
    draftStore.setStep(1, uid);
  }

  function resetCustomerType() {
    setValue("customer_type", undefined as never);
    draftStore.setStep(0, uid);
  }

  async function onSubmit() {
    // The step resolver only covers the last step; validate everything collected so far.
    const values = getValues();
    const full = leadFormSchema.safeParse(values);
    if (!full.success) {
      const firstBad = full.error.issues[0]?.path[0] as keyof LeadFormValues;
      const idx = STEP_FIELDS.findIndex((f) => (f as readonly string[]).includes(firstBad));
      if (idx >= 0) draftStore.setStep(idx, uid);
      return;
    }
    setStatus("sending");
    const d = draftStore.get();
    const attr = readAttribution();
    const event_id = uuid();
    const payload = {
      lead: { ...values, mobile: normalizeEgMobile(values.mobile) ?? values.mobile },
      meta: {
        event_id,
        client_id: gaClientId() ?? "",
        started_at: d.startedAt ?? Date.now() - 60_000,
        page_locale: locale,
        ab_variant: variant,
        lead_intent: d.intent,
        device_type: deviceType(),
        landing_page_url: location.href.slice(0, 2000),
        referrer: document.referrer.slice(0, 2000),
        first_touch: attr.first,
        last_touch: attr.last,
        fbp: readCookie("_fbp") ?? "",
        fbc: readCookie("_fbc") ?? "",
        calculator_payload: d.calc,
        consent_state: readConsentState(),
        turnstile_token: turnstileToken.current,
        website: (document.getElementById(`${uid}-website`) as HTMLInputElement | null)?.value ?? "",
      },
    };

    const res = await postWithRetry(payload);
    if (res === "network") {
      queueLead(payload);
      setStatus("network");
      return;
    }
    if (res.status === 429) return setStatus("rate");
    if (!res.ok) return setStatus("error");

    const body = (await res.json()) as { token: string | null; lead_id?: string; lead_tier?: string; value?: number };
    submitted.current = true;
    try {
      sessionStorage.setItem(
        LAST_LEAD_KEY,
        JSON.stringify({
          event_id,
          lead_id: body.lead_id,
          lead_tier: body.lead_tier,
          value: body.value,
          fleet_size: values.fleet_size,
          lead_intent: d.intent,
          ab_variant: variant,
          calc: d.calc,
          user_data: { email: values.email || undefined, phone_number: payload.lead.mobile },
          booking: { name: values.full_name, phone: payload.lead.mobile, email: values.email, company: values.company_name },
        }),
      );
    } catch {
      /* ignore */
    }
    draftStore.clear();
    router.push(body.token ? `/${locale}/thank-you?t=${encodeURIComponent(body.token)}` : `/${locale}`);
  }

  const errMsg = (key?: string) => (key ? (te.has(key) ? te(key) : te("required")) : undefined);
  const fleet = watch("fleet_size");
  const customerType = watch("customer_type") as string | undefined;
  const whatsappSame = watch("whatsapp_same");
  const waHref = whatsappLink(fleet ? tw("withFleet", { fleet: to(`fleet_size.${fleet}`) }) : tw("default"));

  return (
    <div
      id={primary ? "lead-form" : undefined}
      data-lead-form
      className="card w-full p-4 shadow-[var(--shadow-card)] sm:p-6"
      onFocusCapture={markStarted}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit, reportErrors)} aria-describedby={`${uid}-progress`}>
        {/* progress */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-sm text-muted">
            <span id={`${uid}-progress`} aria-live="polite">
              {t("stepOf", { step: step + 1, total: TOTAL })}
            </span>
            {step > 0 && (
              <button type="button" onClick={back} className="min-h-11 px-2 font-semibold text-brand hover:underline">
                <span aria-hidden className="inline-block rtl:-scale-x-100">
                  ←
                </span>{" "}
                {t("back")}
              </button>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-brand-50" aria-hidden>
            <div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${((step + 1) / TOTAL) * 100}%` }} />
          </div>
        </div>

        {/* honeypot */}
        <div aria-hidden className="sr-only">
          <label htmlFor={`${uid}-website`}>Website</label>
          <input id={`${uid}-website`} name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div key={step} className="step-enter space-y-5">
          {step === 0 && customerType !== "personal" && (
            <>
              <h2 ref={headingRef} tabIndex={-1} data-step-heading className="text-xl font-bold outline-none sm:text-2xl">
                {tl("customer_type")}
              </h2>
              <Controller
                control={control}
                name="customer_type"
                render={({ field }) => (
                  <ChipGroup
                    id={`${uid}-ctype`}
                    name="customer_type"
                    label={tl("customer_type")}
                    hideLabel
                    options={CUSTOMER_TYPES}
                    labels={(o) => to(`customer_type.${o}`)}
                    value={field.value as (typeof CUSTOMER_TYPES)[number] | undefined}
                    onChange={(v) => onCustomerTypePicked(v as string)}
                    columns={2}
                    error={errMsg(errors.customer_type?.message)}
                  />
                )}
              />
            </>
          )}

          {step === 0 && customerType === "personal" && (
            <div role="status" data-testid="personal-stop" className="space-y-3 text-center">
              <h2 ref={headingRef} tabIndex={-1} data-step-heading className="text-xl font-bold outline-none">
                {t("personal.title")}
              </h2>
              <p className="text-muted">{t("personal.body")}</p>
              <button type="button" onClick={resetCustomerType} className="btn btn-ghost w-full">
                {t("personal.back")}
              </button>
            </div>
          )}

          {step === 1 && (
            <>
              <h2 ref={headingRef} tabIndex={-1} data-step-heading className="text-xl font-bold outline-none sm:text-2xl">
                {t("title")}
              </h2>
              <p className="-mt-3 hidden text-sm text-muted sm:block">{t("subtitle")}</p>
              <Controller
                control={control}
                name="fleet_size"
                render={({ field }) => (
                  <ChipGroup
                    id={`${uid}-fleet`}
                    name="fleet_size"
                    label={tl("fleet_size")}
                    hideLabel
                    columns="3fixed"
                    options={FLEET_SIZES}
                    labels={(o) => to(`fleet_size.${o}`)}
                    value={field.value}
                    onChange={(v) => onFleetPicked(v as string)}
                    error={errMsg(errors.fleet_size?.message)}
                  />
                )}
              />
            </>
          )}

          {step === 2 && (
            <>
              <h2 ref={headingRef} tabIndex={-1} data-step-heading className="sr-only">
                {t("stepOf", { step: 3, total: TOTAL })}
              </h2>
              <Controller
                control={control}
                name="monthly_fuel_spend"
                render={({ field }) => (
                  <ChipGroup
                    id={`${uid}-spend`}
                    name="monthly_fuel_spend"
                    label={tl("monthly_fuel_spend")}
                    options={SPEND_BANDS}
                    labels={(o) => to(`monthly_fuel_spend.${o}`)}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    columns={2}
                    error={errMsg(errors.monthly_fuel_spend?.message)}
                  />
                )}
              />
              <Controller
                control={control}
                name="current_method"
                render={({ field }) => (
                  <ChipGroup
                    id={`${uid}-method`}
                    name="current_method"
                    label={tl("current_method")}
                    options={CURRENT_METHODS}
                    labels={(o) => to(`current_method.${o}`)}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    columns={2}
                    error={errMsg(errors.current_method?.message)}
                  />
                )}
              />
              <div>
                <label htmlFor={`${uid}-gov`} className="field-label">
                  {tl("governorate")}
                </label>
                <select
                  id={`${uid}-gov`}
                  className="input"
                  aria-invalid={!!errors.governorate}
                  aria-describedby={errors.governorate ? `${uid}-gov-error` : undefined}
                  {...register("governorate")}
                >
                  <option value="" disabled>
                    {tl("governoratePlaceholder")}
                  </option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      {to(`governorate.${g}`)}
                    </option>
                  ))}
                </select>
                {errors.governorate && (
                  <p id={`${uid}-gov-error`} className="field-error" role="alert">
                    {errMsg(errors.governorate.message)}
                  </p>
                )}
              </div>
              <Controller
                control={control}
                name="vehicle_types"
                render={({ field }) => (
                  <ChipGroup
                    id={`${uid}-vtypes`}
                    name="vehicle_types"
                    label={`${tl("vehicle_types")} ${t("optional")}`}
                    options={VEHICLE_TYPES}
                    labels={(o) => to(`vehicle_types.${o}`)}
                    value={field.value}
                    onChange={field.onChange}
                    multiple
                  />
                )}
              />
            </>
          )}

          {step === 3 && (
            <>
              <h2 ref={headingRef} tabIndex={-1} data-step-heading className="sr-only">
                {t("stepOf", { step: 4, total: TOTAL })}
              </h2>
              <TextField
                id={`${uid}-company`}
                label={tl("company_name")}
                autoComplete="organization"
                error={errMsg(errors.company_name?.message)}
                {...register("company_name")}
              />
              <Controller
                control={control}
                name="job_role"
                render={({ field }) => (
                  <ChipGroup
                    id={`${uid}-role`}
                    name="job_role"
                    label={tl("job_role")}
                    options={JOB_ROLES}
                    labels={(o) => to(`job_role.${o}`)}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    columns={2}
                    error={errMsg(errors.job_role?.message)}
                  />
                )}
              />
              <div>
                <label htmlFor={`${uid}-industry`} className="field-label">
                  {tl("industry")} <span className="font-normal text-muted">{t("optional")}</span>
                </label>
                <select id={`${uid}-industry`} className="input" {...register("industry")}>
                  <option value="">{tl("industryPlaceholder")}</option>
                  {INDUSTRIES.map((g) => (
                    <option key={g} value={g}>
                      {to(`industry.${g}`)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 ref={headingRef} tabIndex={-1} data-step-heading className="sr-only">
                {t("stepOf", { step: 5, total: TOTAL })}
              </h2>
              <TextField
                id={`${uid}-name`}
                label={tl("full_name")}
                autoComplete="name"
                error={errMsg(errors.full_name?.message)}
                {...register("full_name")}
              />
              <TextField
                id={`${uid}-mobile`}
                label={tl("mobile")}
                type="tel"
                inputMode="tel"
                dir="ltr"
                autoComplete="tel"
                placeholder={tl("mobilePlaceholder")}
                error={errMsg(errors.mobile?.message)}
                {...register("mobile", {
                  onChange: (e) => {
                    const w = toWesternDigits(e.target.value);
                    if (w !== e.target.value) setValue("mobile", w);
                  },
                })}
              />
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" className="size-5 accent-[var(--color-brand)]" {...register("whatsapp_same")} />
                <span>{tl("whatsapp_same")}</span>
              </label>
              {!whatsappSame && (
                <TextField
                  id={`${uid}-wa`}
                  label={tl("whatsapp_number")}
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  placeholder={tl("mobilePlaceholder")}
                  error={errMsg(errors.whatsapp_number?.message)}
                  {...register("whatsapp_number", {
                    onChange: (e) => {
                      const w = toWesternDigits(e.target.value);
                      if (w !== e.target.value) setValue("whatsapp_number", w);
                    },
                  })}
                />
              )}
              <TextField
                id={`${uid}-email`}
                label={tl("email")}
                hint={tl("emailHint")}
                type="email"
                inputMode="email"
                dir="ltr"
                autoComplete="email"
                error={errMsg(errors.email?.message)}
                {...register("email")}
              />
              <Controller
                control={control}
                name="preferred_contact"
                render={({ field }) => (
                  <ChipGroup
                    id={`${uid}-pref`}
                    name="preferred_contact"
                    label={`${tl("preferred_contact")} ${t("optional")}`}
                    options={PREFERRED_CONTACT}
                    labels={(o) => to(`preferred_contact.${o}`)}
                    value={field.value || undefined}
                    onChange={field.onChange}
                    columns={2}
                  />
                )}
              />
              <div className="space-y-3 text-sm">
                <div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-5 shrink-0 accent-[var(--color-brand)]"
                      aria-invalid={!!errors.consent_processing}
                      aria-describedby={errors.consent_processing ? `${uid}-consent-error` : undefined}
                      {...register("consent_processing")}
                    />
                    <span>
                      {tl("consent_processing")}{" "}
                      <a href={site.legal.privacyPolicyUrl} target="_blank" rel="noopener" className="font-semibold text-brand underline">
                        {tl("privacyLink")}
                      </a>
                    </span>
                  </label>
                  {errors.consent_processing && (
                    <p id={`${uid}-consent-error`} className="field-error" role="alert">
                      {errMsg(errors.consent_processing.message)}
                    </p>
                  )}
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-muted">
                  <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--color-brand)]" {...register("consent_marketing")} />
                  <span>{tl("consent_marketing")}</span>
                </label>
              </div>
              <Turnstile active={step === 4} onToken={(tok) => (turnstileToken.current = tok)} />
            </>
          )}
        </div>

        {step > 1 && (
          <div className="mt-6">
            {step < TOTAL - 1 ? (
              <button type="button" onClick={next} className="btn btn-primary w-full text-lg">
                {t("next")}
              </button>
            ) : (
              <>
                <button type="submit" className="btn btn-primary w-full text-lg" disabled={status === "sending"} data-testid="submit">
                  {status === "sending" ? t("sending") : t("submit")}
                </button>
                <p className="mt-2 text-center text-sm text-muted">{t("noCommitment")}</p>
              </>
            )}
          </div>
        )}

        {(status === "network" || status === "rate" || status === "error") && (
          <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-red-50 p-3 text-sm">
            <p>{t(status === "network" ? "networkError" : status === "rate" ? "rateLimited" : "genericError")}</p>
            <a href={waHref} className="btn btn-wa-solid mt-3 w-full" data-wa="form_fallback" target="_blank" rel="noopener">
              {t("whatsappFallback")}
            </a>
          </div>
        )}
      </form>
    </div>
  );
}

function withoutConsent(v: Partial<LeadFormValues>) {
  const { consent_processing: _a, consent_marketing: _b, ...rest } = v;
  void _a;
  void _b;
  return rest;
}

function pickConsent(v: Partial<LeadFormValues>) {
  return { consent_processing: v.consent_processing, consent_marketing: v.consent_marketing };
}

async function postWithRetry(payload: unknown): Promise<Response | "network"> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status < 500) return res;
    } catch {
      /* network */
    }
    await new Promise((r) => setTimeout(r, 600 * 2 ** i));
  }
  return "network";
}

function queueLead(payload: unknown) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as unknown[];
    q.push(payload);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-5)));
  } catch {
    /* ignore */
  }
}

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  ref?: React.Ref<HTMLInputElement>;
};

function TextField({ id, label, error, hint, ref, ...rest }: TextFieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label} {hint && <span id={`${id}-hint`} className="text-sm font-normal text-muted">{hint}</span>}
      </label>
      <input
        id={id}
        ref={ref}
        className={`input ${rest.dir === "ltr" ? "text-start [unicode-bidi:plaintext]" : ""}`}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
