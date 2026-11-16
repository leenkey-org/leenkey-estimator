import type { Metadata } from "next";
import Link from "next/link";
import { InfoNote } from "@/components/shared/info-note";
import { SectionTitle } from "@/components/shared/section-title";
import { requireProfile } from "@/core/auth/session";
import { DeletionForm } from "@/leenkey/account/components/deletion-form";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frAccount } from "@/lib/i18n/sections/account";
import { SpacePage } from "../../_components/space-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { account: frAccount } as const;

const t = fr.account.deletion;

export const metadata: Metadata = { title: t.metaTitle };

const linkClass =
  "rounded-lk-sm font-semibold text-lk-blue underline underline-offset-2 focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue";

function Block({ id, title, items }: { id: string; title: string; items: readonly string[] }) {
  return (
    <section aria-labelledby={id} className="mt-6 flex flex-col gap-2">
      <SectionTitle id={id}>{title}</SectionTitle>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-lk-secondary text-lk-ink-2">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

// The deletion of the account (L2-10, SPEC-V2 sections 19 and 21): what
// happens at once, after 30 days, what is kept; the export first; then the
// password and a box ticked. An admin account is closed by the team. Open
// without the current terms accepted (lib/legal/versions.ts).
export default async function AccountDeletionPage() {
  const profile = await requireProfile();
  const admin = profile.roles.includes("admin");
  return (
    <SpacePage
      title={t.title}
      roles={profile.roles}
      profileId={profile.id}
      back={{ href: ROUTES.account, label: fr.account.back }}
    >
      {admin ? (
        <p className="mt-6 text-lk-secondary text-lk-ink-2">{t.admin}</p>
      ) : (
        <>
          <p className="mt-6 text-lk-body text-lk-ink-2">{t.lead}</p>
          <Block id="suppression-maintenant" title={t.now.title} items={t.now.items} />
          <Block id="suppression-30-jours" title={t.later.title} items={t.later.items} />
          <Block id="suppression-garde" title={t.kept.title} items={t.kept.items} />
          <div className="mt-6 flex flex-col gap-3">
            {profile.roles.includes("seller") ? (
              <InfoNote>
                <p>
                  {t.plan}{" "}
                  <Link href={ROUTES.plan} className={linkClass}>
                    {t.planLink}
                  </Link>
                </p>
              </InfoNote>
            ) : null}
            <p className="text-lk-secondary text-lk-ink-2">
              {t.exportNote}{" "}
              <a href={ROUTES.accountExport} download className={linkClass}>
                {fr.account.rows.export}
              </a>
            </p>
          </div>
          <DeletionForm />
        </>
      )}
    </SpacePage>
  );
}
