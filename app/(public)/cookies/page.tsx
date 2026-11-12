import type { Metadata } from "next";
import { CookieSettingsButton } from "@/components/shared/cookie-settings-button";
import { frLegal } from "@/lib/i18n/sections/legal";
import { LegalPage } from "../_components/legal-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { legal: frLegal } as const;

const t = fr.legal.cookies;

export const metadata: Metadata = { title: t.metaTitle };

// L1-36, L1-37. Every cookie and browser storage of the code (consent,
// session, email links, listing views, valuation tool, map, GA4 after
// consent), with the fields of the legal file (name, provider, purpose,
// category, lifetime); published for the launch (DECISIONS.md 2026-11-09).
export default function CookiesPage() {
  return (
    <LegalPage title={t.title} lead={t.lead} updated={t.updated} contact={t.contact} draft={false}>
      <p className="text-lk-body text-pretty text-lk-ink-2">{t.intro}</p>
      <section aria-labelledby="liste-des-cookies" className="flex flex-col gap-3">
        <h2 id="liste-des-cookies" className="text-lk-h3 font-semibold text-lk-ink">
          {t.listTitle}
        </h2>
        <ul className="flex flex-col gap-3">
          {t.rows.map((row) => (
            <li key={row.name} className="rounded-lk-md border border-lk-line p-4">
              <h3 className="text-lk-label font-semibold break-words text-lk-ink">{row.name}</h3>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-lk-secondary">
                <dt className="text-lk-ink-3">{t.labels.provider}</dt>
                <dd className="text-lk-ink-2">{row.provider}</dd>
                <dt className="text-lk-ink-3">{t.labels.purpose}</dt>
                <dd className="text-lk-ink-2">{row.purpose}</dd>
                <dt className="text-lk-ink-3">{t.labels.kind}</dt>
                <dd className="text-lk-ink-2">
                  {row.kind === "optional" ? t.optional : t.necessary}
                </dd>
                <dt className="text-lk-ink-3">{t.labels.duration}</dt>
                <dd className="text-lk-ink-2">{row.duration}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-lk-body text-lk-ink-2">{t.noCookie}</p>
      <p className="text-lk-body text-lk-ink-2">
        {t.manageText}{" "}
        <CookieSettingsButton className="cursor-pointer rounded-lk-sm font-semibold text-lk-blue underline underline-offset-2 focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue" />
        .
      </p>
    </LegalPage>
  );
}
