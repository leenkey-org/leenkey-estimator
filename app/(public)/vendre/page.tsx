import type { Metadata } from "next";
import Link from "next/link";
import { ChartLine, FilePlus2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/shared/button";
import { MarketingSection } from "@/components/shared/marketing-section";
import { getProfile } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { PublicPage } from "@/leenkey/site/components/public-page";
import { fr } from "@/lib/i18n/fr";

const t = fr.sellStart;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.description,
  alternates: { canonical: "/vendre" },
  openGraph: { title: t.metaTitle, description: t.description, url: "/vendre" },
};

/** The listing straight away: the seller sign-up first when signed out. */
function directHref(signedIn: boolean): string {
  if (signedIn) return ROUTES.newProperty;
  return `${ROUTES.sellerSignUp}&next=${encodeURIComponent(ROUTES.newProperty)}`;
}

function Choice({
  icon: Icon,
  title,
  text,
  action,
  primary = false,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action: { href: string; label: string };
  primary?: boolean;
}) {
  return (
    <li className="flex flex-col gap-4 rounded-lk-md border border-lk-line bg-lk-surface p-6">
      <span className="flex size-11 items-center justify-center rounded-lk-sm bg-lk-blue-tint text-lk-blue">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex flex-1 flex-col gap-2">
        <h2 className="text-lk-h3 font-semibold text-lk-ink">{title}</h2>
        <p className="text-lk-body text-lk-ink-2">{text}</p>
      </div>
      <Button asChild variant={primary ? "primary" : "secondary"} className="w-full md:w-auto">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    </li>
  );
}

// /vendre (Younes, DECISIONS 2026-10-26): « Vendre » and « Vendre mon bien »
// lead here, to the two ways to start: the free analysis of value (the
// estimator, then « Créer mon annonce » from its result, L1-13b) or the
// listing straight away (the creation of the property, L1-11).
export default async function SellStartPage() {
  const profile = await getProfile();
  return (
    <PublicPage>
      <MarketingSection id="vendre" title={t.title} titleAs="h1" lead={t.lead}>
        <ul className="grid gap-4 md:grid-cols-2 md:gap-6">
          <Choice
            icon={ChartLine}
            title={t.valuation.title}
            text={t.valuation.text}
            action={{ href: ROUTES.valuation, label: t.valuation.action }}
            primary
          />
          <Choice
            icon={FilePlus2}
            title={t.direct.title}
            text={t.direct.text}
            action={{ href: directHref(profile !== null), label: t.direct.action }}
          />
        </ul>
      </MarketingSection>
    </PublicPage>
  );
}
