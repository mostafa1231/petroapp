import { whatsappNumberNoPlus } from "../../config/site";

/** wa.me deep link with a pre-filled message. */
export function whatsappLink(text: string): string {
  return `https://wa.me/${whatsappNumberNoPlus}?text=${encodeURIComponent(text)}`;
}

/** Appends a short attribution ref so the WhatsApp inbox/CRM can attribute the chat. */
export function withRef(text: string, ref: string | undefined | null): string {
  return ref ? `${text} (ref: ${ref})` : text;
}
