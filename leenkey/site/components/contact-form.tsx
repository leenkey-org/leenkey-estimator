"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { flushSync } from "react-dom";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { Select } from "@/components/shared/select";
import { Textarea } from "@/components/shared/textarea";
import { fr } from "@/lib/i18n/fr";
import {
  CONTACT_MESSAGE_MAX,
  CONTACT_MOTIFS,
  contactRequest,
  parseContact,
  type ContactError,
  type ContactField,
  type ContactMotif,
  type ContactSource,
} from "@/lib/validations/contact";

const t = fr.site.contact;

const EMPTY = { motif: "", prenom: "", nom: "", email: "", telephone: "", message: "" };
type Values = Record<ContactField, string>;

/**
 * Contact form of the public site, the V1 one rebuilt in V2 (DECISIONS
 * 2026-10-19): same fields, same names and ids (GTM), same POST to
 * /api/contact. The errors show under each field and the focus goes to the
 * first one; once sent, the form gives way to « .form-success », its sibling
 * as in the V1.
 */
export function ContactForm({
  source,
  formId = "contact-form",
  idPrefix = "cf",
  motifs = CONTACT_MOTIFS,
  className,
}: {
  source: ContactSource;
  formId?: string;
  /** Prefix of the field ids (« cf-email »), unique on the page. */
  idPrefix?: string;
  /** Order of the motifs: the page's own first (Investir). */
  motifs?: readonly ContactMotif[];
  className?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const sentTitle = useRef<HTMLHeadingElement>(null);
  const sending = useRef(false);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<ContactField, ContactError>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const errorOf = (field: ContactField) => {
    const key = errors[field];
    return key ? t.errors[key] : undefined;
  };

  function change(field: ContactField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const checked = parseContact(values);
    if (!checked.ok) {
      flushSync(() => {
        setErrors(checked.errors);
        setStatus("idle");
      });
      form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    sending.current = true;
    setStatus("sending");
    let ok = false;
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactRequest(source, checked.data)),
        // Never a button busy for good: past 20 s, the failure message.
        signal: AbortSignal.timeout(20_000),
      });
      ok = response.ok;
    } catch (error) {
      console.error("[site] contact form not sent", error);
    }
    sending.current = false;
    if (!ok) {
      setStatus("failed");
      return;
    }
    flushSync(() => setStatus("sent"));
    sentTitle.current?.focus();
  }

  const id = (field: string) => `${idPrefix}-${field}`;
  const sent = status === "sent";

  return (
    <div className={className}>
      <form
        ref={form}
        id={formId}
        onSubmit={submit}
        noValidate
        hidden={sent}
        className="flex flex-col gap-3.5 rounded-lk-md border border-lk-line bg-lk-surface p-4 md:p-6"
      >
        {status === "failed" ? (
          <InlineAlert tone="danger">
            {t.failed}{" "}
            <a
              href={`mailto:${fr.legal.contactEmail}`}
              className="font-semibold underline underline-offset-2"
            >
              {fr.legal.contactEmail}
            </a>
          </InlineAlert>
        ) : null}
        <Select
          id={id("motif")}
          name="motif"
          label={t.motif}
          placeholder={t.motifPlaceholder}
          value={values.motif}
          error={errorOf("motif")}
          onChange={(event) => change("motif", event.target.value)}
        >
          {motifs.map((motif) => (
            <option key={motif} value={motif}>
              {t.motifs.find((option) => option.value === motif)?.label ?? motif}
            </option>
          ))}
        </Select>
        <div className="grid gap-3.5 md:grid-cols-2">
          <Input
            id={id("prenom")}
            name="prenom"
            label={t.firstName}
            autoComplete="given-name"
            value={values.prenom}
            error={errorOf("prenom")}
            onChange={(event) => change("prenom", event.target.value)}
          />
          <Input
            id={id("nom")}
            name="nom"
            label={t.lastName}
            autoComplete="family-name"
            value={values.nom}
            error={errorOf("nom")}
            onChange={(event) => change("nom", event.target.value)}
          />
          <Input
            id={id("email")}
            name="email"
            type="email"
            label={t.email}
            autoComplete="email"
            inputMode="email"
            value={values.email}
            error={errorOf("email")}
            onChange={(event) => change("email", event.target.value)}
          />
          <Input
            id={id("tel")}
            name="telephone"
            type="tel"
            label={t.phone}
            optional
            autoComplete="tel"
            value={values.telephone}
            error={errorOf("telephone")}
            onChange={(event) => change("telephone", event.target.value)}
          />
        </div>
        <Textarea
          id={id("message")}
          name="message"
          label={t.message}
          rows={5}
          maxLength={CONTACT_MESSAGE_MAX}
          value={values.message}
          error={errorOf("message")}
          onChange={(event) => change("message", event.target.value)}
        />
        <Button type="submit" size="lg" loading={status === "sending"} className="md:self-start">
          {t.submit}
        </Button>
        <p className="text-lk-caption text-lk-ink-3">
          {t.note} ·{" "}
          <Link href="/confidentialite" className="underline underline-offset-2 hover:text-lk-ink">
            {t.privacy}
          </Link>
        </p>
      </form>
      <div
        role="status"
        hidden={!sent}
        className="form-success rounded-lk-md border border-lk-line bg-lk-surface p-4 md:p-6"
      >
        {sent ? (
          <>
            <h3
              ref={sentTitle}
              tabIndex={-1}
              className="text-lk-h3 font-semibold text-lk-ink outline-none lg:text-lk-h3-lg"
            >
              {t.sent.title}
            </h3>
            <p className="mt-2 text-lk-body text-lk-ink-2">{t.sent.text}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
