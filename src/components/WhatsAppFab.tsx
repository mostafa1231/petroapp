import { getTranslations } from "next-intl/server";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./Icons";

/** Desktop floating WhatsApp button at the inline-end bottom (left in RTL, right in LTR). */
export async function WhatsAppFab() {
  const t = await getTranslations("header");
  const tw = await getTranslations("wa");
  return (
    <a
      href={whatsappLink(tw("default"))}
      target="_blank"
      rel="noopener"
      data-loc="fab"
      aria-label={t("whatsapp")}
      className="fixed bottom-6 end-6 z-40 hidden size-14 items-center justify-center rounded-full bg-wa-bright text-white shadow-lg transition-transform hover:scale-105 md:flex"
    >
      <WhatsAppIcon className="size-8" />
    </a>
  );
}
