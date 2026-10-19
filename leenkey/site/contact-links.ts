// Direct links of the contact block of /investir (V1 page): WhatsApp to
// Cédric, with a first message ready, and an email to the team. Pure, for the
// tests.

/** Cédric's number, the one of the legal notice (/mentions-legales). */
export const LEENKEY_WHATSAPP = "33613845451";

export function whatsappHref(message: string): string {
  return `https://wa.me/${LEENKEY_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export function emailHref(address: string, subject: string, body: string): string {
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
