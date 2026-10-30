import { getLocale, getTranslations } from "next-intl/server";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/Icons";

export default async function LocaleNotFound() {
  const locale = await getLocale();
  const t = await getTranslations("notFound");
  const tw = await getTranslations("wa");
  return (
    <main className="container-x flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl">{t("title")}</h1>
      <p className="text-muted">{t("body")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <a href={`/${locale}`} className="btn btn-primary">
          {t("home")}
        </a>
        <a href={whatsappLink(tw("default"))} className="btn btn-wa" data-loc="404" target="_blank" rel="noopener">
          <WhatsAppIcon className="size-5" />
          WhatsApp
        </a>
      </div>
    </main>
  );
}
