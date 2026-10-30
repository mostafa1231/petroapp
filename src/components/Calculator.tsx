"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { site, type FuelType } from "@config/site";
import { calculateSavings } from "@/lib/calculator";
import { draftStore, openLeadForm } from "@/lib/draft-store";
import { formatEgp, formatNumber } from "@/lib/format";
import { fleetSizeFromCount, spendBandFromEgp } from "@/lib/options";
import { toWesternDigits } from "@/lib/phone";
import { track } from "@/lib/tracking";

const FUELS: FuelType[] = ["92", "95", "diesel", "80", "cng"];

export function Calculator() {
  const t = useTranslations("calc");
  const locale = useLocale() as "ar" | "en";
  const [vehicles, setVehicles] = useState(String(site.calculator.defaultVehicles));
  const [fuel, setFuel] = useState<FuelType>(site.calculator.defaultFuel);
  const [litres, setLitres] = useState(String(site.calculator.defaultLitresPerVehicle));
  const [price, setPrice] = useState(String(site.fuelPrices.prices[site.calculator.defaultFuel]));
  const [waste, setWaste] = useState<number>(site.calculator.waste.default);
  const used = useRef(false);
  const completed = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const num = (s: string) => Number(toWesternDigits(s).replace(/[^\d.]/g, "")) || 0;
  const result = useMemo(
    () => calculateSavings({ vehicles: num(vehicles), fuelType: fuel, litresPerVehicle: num(litres), wastePct: waste, pricePerLitre: num(price) }),
    [vehicles, fuel, litres, waste, price],
  );

  function touched() {
    if (used.current) return;
    used.current = true;
    track("calculator_used", { vehicles: num(vehicles), fuel_type: fuel });
  }

  // calculator_completed once the result is on screen after interaction.
  useEffect(() => {
    const el = resultRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && used.current && !completed.current) {
          completed.current = true;
          track("calculator_completed", { vehicles: num(vehicles), fuel_type: fuel, est_spend: result.monthlySpend, est_saving: result.yearlySaving });
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  });

  function onFuel(f: FuelType) {
    touched();
    setFuel(f);
    setPrice(String(site.fuelPrices.prices[f]));
  }

  function submit() {
    touched();
    const v = num(vehicles);
    draftStore.prefill(
      { fleet_size: fleetSizeFromCount(Math.max(1, v)), monthly_fuel_spend: spendBandFromEgp(result.monthlySpend) },
      {
        intent: "calculator",
        step: 1,
        calc: { vehicles: v, fuel_type: fuel, litres: num(litres), waste_pct: waste, est_spend: result.monthlySpend, est_saving: result.yearlySaving },
      },
    );
    track("cta_click", { cta_id: "calculator_submit", location: "calculator" });
    openLeadForm();
  }

  const isCng = fuel === "cng";
  const fmt = (n: number) => formatEgp(n, locale);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="card space-y-5 p-5 sm:p-6" onInput={touched}>
        <NumberField id="calc-vehicles" label={t("vehicles")} value={vehicles} onChange={setVehicles} />
        <fieldset>
          <legend className="field-label">{t("fuelType")}</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {FUELS.map((f) => (
              <button key={f} type="button" role="radio" aria-checked={fuel === f} className="chip text-sm" onClick={() => onFuel(f)}>
                {t(`fuel.${f}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <NumberField id="calc-litres" label={isCng ? t("litresCng") : t("litres")} value={litres} onChange={setLitres} />
        <NumberField
          id="calc-price"
          label={isCng ? t("priceCng") : t("price")}
          hint={t("priceNote", { label: site.fuelPrices.label[locale] })}
          value={price}
          onChange={setPrice}
          decimal
        />
        <div>
          <label htmlFor="calc-waste" className="field-label flex items-center justify-between">
            <span>{t("waste")}</span>
            <bdi className="font-bold text-brand">{formatNumber(waste, locale)}%</bdi>
          </label>
          <input
            id="calc-waste"
            type="range"
            min={site.calculator.waste.min}
            max={site.calculator.waste.max}
            step={1}
            value={waste}
            onChange={(e) => {
              touched();
              setWaste(Number(e.target.value));
            }}
            className="h-11 w-full accent-[var(--color-brand)]"
            aria-describedby="calc-waste-hint"
          />
          <p id="calc-waste-hint" className="text-sm text-muted">
            {t("wasteHint")}
          </p>
        </div>
      </div>

      <div ref={resultRef} className="flex flex-col justify-between rounded-[var(--radius-card)] bg-brand p-5 text-white sm:p-6" aria-live="polite">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-white/80">{t("monthlySpend")}</dt>
            <dd className="text-xl font-bold">
              <bdi>{fmt(result.monthlySpend)}</bdi>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-white/80">{t("yearlySpend")}</dt>
            <dd className="text-xl font-bold">
              <bdi>{fmt(result.yearlySpend)}</bdi>
            </dd>
          </div>
        </dl>
        <div className="my-6 rounded-xl bg-white/10 p-4">
          <p className="text-white/90">{t("saving")}</p>
          <p className="text-3xl font-bold sm:text-4xl" data-testid="calc-saving">
            <bdi>{fmt(result.yearlySaving)}</bdi>
          </p>
          <p className="text-white/90">{t("perYear")}</p>
        </div>
        <p className="mb-4 text-sm text-white/90">
          {t("reference", { pct: site.claims.egyptSavingPct, amount: fmt(result.referenceYearlySaving) })}
        </p>
        <button type="button" onClick={submit} className="btn w-full bg-white text-lg text-brand hover:bg-brand-50" data-testid="calc-cta">
          {t("cta")}
        </button>
        <p className="mt-3 text-xs text-white/75">{t("disclaimer")}</p>
      </div>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
  decimal,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  decimal?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        className="input text-start"
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        dir="ltr"
        value={value}
        onChange={(e) => onChange(toWesternDigits(e.target.value).replace(decimal ? /[^\d.]/g : /\D/g, "").slice(0, 7))}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
