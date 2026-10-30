#!/usr/bin/env node
/**
 * Generates gtm/gtm-container.json — import it in GTM (Admin → Import
 * container → Merge). Replace the placeholder constants (or the GTM
 * variables after import) with real IDs.
 */
import { writeFileSync } from "node:fs";

const ACCOUNT = "0", CONTAINER = "0";
let id = 1;
const nextId = () => String(id++);
const base = () => ({ accountId: ACCOUNT, containerId: CONTAINER });
const tpl = (key, value) => ({ type: "TEMPLATE", key, value });
const bool = (key, value) => ({ type: "BOOLEAN", key, value: String(value) });

// ---------------- variables ----------------
const variables = [];
const constVar = (name, value) => variables.push({ ...base(), variableId: nextId(), name, type: "c", parameter: [tpl("value", value)] });
const dlv = (name, key) => variables.push({ ...base(), variableId: nextId(), name, type: "v", parameter: [tpl("name", key), { type: "INTEGER", key: "dataLayerVersion", value: "2" }, bool("setDefaultValue", false)] });

constVar("C - GA4 Measurement ID", "G-XXXXXXXXXX");
constVar("C - Meta Pixel ID", "000000000000000");
constVar("C - Google Ads ID", "AW-000000000");
constVar("C - Google Ads Lead Label", "XXXXXXXXXXXXXXXX");
constVar("C - Google Ads Contact Label", "YYYYYYYYYYYYYYYY");
for (const k of ["event_id", "lead_tier", "fleet_size", "lead_intent", "ab_variant", "locale", "value", "currency", "location", "cta_id", "step_number", "field", "percent", "to_locale", "last_step", "vehicles", "fuel_type", "est_spend", "est_saving", "page_type"]) dlv(`DLV - ${k}`, k);
dlv("DLV - user_data.email", "user_data.email");
dlv("DLV - user_data.phone_number", "user_data.phone_number");
variables.push({
  ...base(), variableId: nextId(), name: "UPD - Enhanced conversions", type: "awec",
  parameter: [tpl("mode", "MANUAL"), tpl("email", "{{DLV - user_data.email}}"), tpl("phone_number", "{{DLV - user_data.phone_number}}")],
});

// ---------------- triggers ----------------
const triggers = {};
const ce = (event) => {
  const t = { ...base(), triggerId: nextId(), name: `CE - ${event}`, type: "CUSTOM_EVENT", customEventFilter: [{ type: "EQUALS", parameter: [tpl("arg0", "{{_event}}"), tpl("arg1", event)] }] };
  triggers[event] = t;
  return t.triggerId;
};
const EVENTS = ["page_view", "scroll_depth", "cta_click", "fleet_size_selected", "calculator_used", "calculator_completed", "form_start", "form_step_complete", "form_error", "form_abandon", "generate_lead", "whatsapp_click", "phone_click", "demo_booked", "lang_switch", "exit_intent_shown"];
EVENTS.forEach(ce);
const initTrigger = { ...base(), triggerId: nextId(), name: "Init - All Pages", type: "INIT" };

// ---------------- tags ----------------
const tags = [];
const consent = (...types) => ({ consentStatus: "NEEDED", consentType: { type: "LIST", list: types.map((t) => ({ type: "TEMPLATE", value: t })) } });

tags.push({
  ...base(), tagId: nextId(), name: "GA4 - Config", type: "googtag",
  parameter: [tpl("tagId", "{{C - GA4 Measurement ID}}"), { type: "LIST", key: "configSettingsTable", list: [{ type: "MAP", map: [tpl("parameter", "send_page_view"), tpl("parameterValue", "false")] }] }],
  firingTriggerId: [initTrigger.triggerId], consentSettings: consent("analytics_storage"),
});

const GA4_PARAMS = {
  page_view: ["locale", "ab_variant", "page_type"],
  scroll_depth: ["percent"],
  cta_click: ["cta_id", "location"],
  fleet_size_selected: ["fleet_size"],
  calculator_used: ["vehicles", "fuel_type"],
  calculator_completed: ["vehicles", "fuel_type", "est_spend", "est_saving"],
  form_start: ["lead_intent"],
  form_step_complete: ["step_number"],
  form_error: ["field", "step_number"],
  form_abandon: ["last_step", "lead_intent"],
  generate_lead: ["lead_tier", "fleet_size", "lead_intent", "ab_variant", "value", "currency", "event_id"],
  whatsapp_click: ["location"],
  phone_click: ["location"],
  demo_booked: ["location"],
  lang_switch: ["to_locale"],
  exit_intent_shown: [],
};
for (const [event, params] of Object.entries(GA4_PARAMS)) {
  tags.push({
    ...base(), tagId: nextId(), name: `GA4 - ${event}`, type: "gaawe",
    parameter: [
      tpl("eventName", event),
      tpl("measurementIdOverride", "{{C - GA4 Measurement ID}}"),
      { type: "LIST", key: "eventSettingsTable", list: params.map((p) => ({ type: "MAP", map: [tpl("parameter", p), tpl("parameterValue", `{{DLV - ${p}}}`)] })) },
    ],
    firingTriggerId: [triggers[event].triggerId], consentSettings: consent("analytics_storage"),
  });
}

const pixelBase = `<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','{{C - Meta Pixel ID}}');fbq('track','PageView');
</script>`;
tags.push({ ...base(), tagId: nextId(), name: "Meta - Base + PageView", type: "html", parameter: [tpl("html", pixelBase), bool("supportDocumentWrite", false)], firingTriggerId: [triggers.page_view.triggerId], consentSettings: consent("ad_storage") });
const fbqTag = (name, trigger, js) =>
  tags.push({ ...base(), tagId: nextId(), name, type: "html", parameter: [tpl("html", `<script>window.fbq&&${js}</script>`), bool("supportDocumentWrite", false)], firingTriggerId: [triggers[trigger].triggerId], consentSettings: consent("ad_storage") });
fbqTag("Meta - Lead", "generate_lead", `fbq('track','Lead',{value:{{DLV - value}},currency:'EGP',lead_tier:'{{DLV - lead_tier}}'},{eventID:'{{DLV - event_id}}'});`);
fbqTag("Meta - Contact (WhatsApp)", "whatsapp_click", `fbq('track','Contact',{channel:'whatsapp'},{eventID:'{{DLV - event_id}}'});`);
fbqTag("Meta - Contact (Phone)", "phone_click", `fbq('track','Contact',{channel:'phone'},{eventID:'{{DLV - event_id}}'});`);
fbqTag("Meta - Schedule", "demo_booked", `fbq('track','Schedule',{},{eventID:'{{DLV - event_id}}'});`);
fbqTag("Meta - FleetSizeSelected", "fleet_size_selected", `fbq('trackCustom','FleetSizeSelected',{fleet_size:'{{DLV - fleet_size}}'});`);
fbqTag("Meta - CalculatorCompleted", "calculator_completed", `fbq('trackCustom','CalculatorCompleted',{vehicles:{{DLV - vehicles}}});`);

tags.push({ ...base(), tagId: nextId(), name: "Google Ads - Conversion Linker", type: "gclidw", parameter: [bool("enableCrossDomain", false)], firingTriggerId: [initTrigger.triggerId] });
tags.push({
  ...base(), tagId: nextId(), name: "Google Ads - Lead (enhanced conversions)", type: "awct",
  parameter: [
    tpl("conversionId", "{{C - Google Ads ID}}"), tpl("conversionLabel", "{{C - Google Ads Lead Label}}"),
    tpl("conversionValue", "{{DLV - value}}"), tpl("currencyCode", "EGP"), tpl("orderId", "{{DLV - event_id}}"),
    bool("enableEnhancedConversion", true), tpl("cssProvidedEnhancedConversionValue", "{{UPD - Enhanced conversions}}"),
  ],
  firingTriggerId: [triggers.generate_lead.triggerId], consentSettings: consent("ad_storage"),
});
for (const ev of ["whatsapp_click", "phone_click"]) {
  tags.push({
    ...base(), tagId: nextId(), name: `Google Ads - Secondary ${ev}`, type: "awct",
    parameter: [tpl("conversionId", "{{C - Google Ads ID}}"), tpl("conversionLabel", "{{C - Google Ads Contact Label}}"), tpl("orderId", "{{DLV - event_id}}")],
    firingTriggerId: [triggers[ev].triggerId], consentSettings: consent("ad_storage"),
  });
}

const container = {
  exportFormatVersion: 2,
  exportTime: new Date().toISOString().replace("T", " ").slice(0, 19),
  containerVersion: {
    ...base(), containerVersionId: "0",
    container: { ...base(), name: "PetroApp EG Landing", usageContext: ["WEB"], features: {} },
    tag: tags,
    trigger: [initTrigger, ...Object.values(triggers)],
    variable: variables,
    builtInVariable: [{ ...base(), type: "EVENT", name: "Event" }, { ...base(), type: "PAGE_URL", name: "Page URL" }],
  },
};
writeFileSync(new URL("../gtm/gtm-container.json", import.meta.url), JSON.stringify(container, null, 2));
console.log(`gtm/gtm-container.json: ${tags.length} tags, ${Object.keys(triggers).length + 1} triggers, ${variables.length} variables`);
