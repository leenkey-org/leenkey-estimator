import { z } from "zod";

// Contact forms of the public site (V1 forms rebuilt in V2, DECISIONS
// 2026-10-19). The fields and the motif values are those that /api/contact
// reads (lib/legacy-api/contact.ts): the endpoint is unchanged.

export const CONTACT_MOTIFS = ["Vendeur", "Investisseur", "Partenaire", "Presse", "Autre"] as const;
export type ContactMotif = (typeof CONTACT_MOTIFS)[number];

/** Form of the home page (« contact »), of the pages Investir and Concept. */
export const CONTACT_SOURCES = ["contact", "investir", "concept"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

export const CONTACT_MESSAGE_MAX = 4000;

const text = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");

export const contactFormSchema = z.object({
  motif: z.enum(CONTACT_MOTIFS, { message: "motif" }),
  prenom: text(80),
  nom: text(80),
  email: z.string().trim().min(1, "required").max(254, "tooLong").email("email"),
  telephone: z.string().trim().max(30, "tooLong"),
  message: text(CONTACT_MESSAGE_MAX),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
export type ContactField = keyof ContactFormValues;
/** Key of the message of a refused field (fr.site.contact.errors). */
export type ContactError = "motif" | "required" | "email" | "tooLong";

export const CONTACT_FIELDS: readonly ContactField[] = [
  "motif",
  "prenom",
  "nom",
  "email",
  "telephone",
  "message",
];

const ERROR_KEYS: readonly ContactError[] = ["motif", "required", "email", "tooLong"];

/**
 * The form checked: its values trimmed, or the fields refused, each with the
 * key of its message (the first issue of a field wins).
 */
export function parseContact(
  input: unknown,
):
  | { ok: true; data: ContactFormValues }
  | { ok: false; errors: Partial<Record<ContactField, ContactError>> } {
  const parsed = contactFormSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: Partial<Record<ContactField, ContactError>> = {};
  for (const issue of parsed.error.issues) {
    const field = CONTACT_FIELDS.find((name) => name === issue.path[0]);
    if (!field) continue;
    errors[field] ??= ERROR_KEYS.find((key) => key === issue.message) ?? "required";
  }
  return { ok: false, errors };
}

/** Body of the POST to /api/contact, as the V1 pages sent it. */
export function contactRequest(source: ContactSource, values: ContactFormValues) {
  return {
    source,
    data: {
      motif: values.motif,
      prenom: values.prenom,
      nom: values.nom,
      email: values.email,
      telephone: values.telephone,
      message: values.message,
    },
  };
}
