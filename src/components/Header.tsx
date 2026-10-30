import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { site } from "@config/site";
import { whatsappLink } from "@/lib/whatsapp";
import { formatEgMobileNational } from "@/lib/phone";
import { PhoneIcon, WhatsAppIcon } from "./Icons";
import { LangToggle } from "./LangToggle";

/** Minimal header: logo (scrolls to top), phone/WhatsApp on desktop, language toggle. No nav links. */
export async function Header({ locale, path }: { locale: "ar" | "en"; path?: string }) {
  const t = await getTranslations("header");
  const tw = await getTranslations("wa");
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur" data-section="header">
      <div className="container-x flex h-16 items-center justify-between gap-3">
        <a href="#top" aria-label="PetroApp" className="shrink-0">
          <Image src="/brand/petroapp-logo.png" alt="PetroApp" width={150} height={33} priority className="h-7 w-auto sm:h-8" />
        </a>
        <div className="flex items-center gap-2">
          <a
            href={`tel:${site.contact.salesPhoneE164}`}
            data-loc="header"
            className="hidden min-h-11 items-center gap-2 px-2 font-semibold text-ink hover:text-brand md:inline-flex"
          >
            <PhoneIcon className="size-5" />
            <bdi dir="ltr">{formatEgMobileNational(site.contact.salesPhoneE164)}</bdi>
          </a>
          <a
            href={whatsappLink(tw("default"))}
            data-loc="header"
            target="_blank"
            rel="noopener"
            aria-label={t("whatsapp")}
            className="hidden size-11 items-center justify-center rounded-full text-wa hover:bg-[#eaf7ef] md:inline-flex"
          >
            <WhatsAppIcon className="size-6" />
          </a>
          <LangToggle locale={locale} path={path} />
        </div>
      </div>
    </header>
  );
}
