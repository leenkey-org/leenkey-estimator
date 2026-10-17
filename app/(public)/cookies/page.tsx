import type { Metadata } from "next";
import { CookieSettingsButton } from "@/components/shared/cookie-settings-button";
import { fr } from "@/lib/i18n/fr";
import { LegalPage } from "../_components/legal-page";

const t = fr.legal.cookies;

export const metadata: Metadata = { title: t.metaTitle };

// L1-36, L1-37. The list is the one of the code (consent, session, links,
// views, GA4 after consent). TODO(client): final text from Cédric's lawyer
// (Q34), who also confirms the exemption of the functional cookies.
export default function CookiesPage() {
  return (
    <LegalPage title={t.title} lead={t.lead} contact={t.contact}>
      <div>
        <table className="w-full border-collapse text-left text-lk-secondary">
          <caption className="mb-2 text-left text-lk-label font-semibold text-lk-ink">
            {t.tableCaption}
          </caption>
          <thead className="text-lk-ink-3">
            <tr className="border-b border-lk-line">
              <th scope="col" className="py-2 pr-3 font-semibold">
                {t.columns.name}
              </th>
              <th scope="col" className="py-2 pr-3 font-semibold">
                {t.columns.purpose}
              </th>
              <th scope="col" className="py-2 pr-3 font-semibold">
                {t.columns.kind}
              </th>
              <th scope="col" className="py-2 font-semibold">
                {t.columns.duration}
              </th>
            </tr>
          </thead>
          <tbody className="text-lk-ink-2">
            {t.rows.map((row) => (
              <tr key={row.name} className="border-b border-lk-line align-top">
                <th scope="row" className="py-2.5 pr-3 font-mono text-lk-caption text-lk-ink">
                  {row.name}
                </th>
                <td className="py-2.5 pr-3">{row.purpose}</td>
                <td className="py-2.5 pr-3">
                  {row.kind === "optional" ? t.optional : t.necessary}
                </td>
                <td className="py-2.5">{row.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-lk-body text-lk-ink-2">{t.noCookie}</p>
      <p className="text-lk-body text-lk-ink-2">
        {t.manageText}{" "}
        <CookieSettingsButton className="cursor-pointer rounded-lk-sm font-semibold text-lk-blue underline underline-offset-2 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue" />
        .
      </p>
    </LegalPage>
  );
}
