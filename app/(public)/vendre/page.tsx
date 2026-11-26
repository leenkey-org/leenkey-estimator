import type { Metadata } from "next";
import Link from "next/link";
import { ChartLine, FilePlus2, Tag } from "lucide-react";
import { ChoiceCard } from "@/components/shared/choice-card";
import { InlineAlert } from "@/components/shared/inline-alert";
import { ShowcaseHero } from "@/components/shared/showcase-hero";
import { getProfile } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { sellerProperties } from "@/leenkey/properties/queries";
import { StepsSection } from "@/leenkey/site/components/home-sections";
import { PublicPage } from "@/leenkey/site/components/public-page";
import { frSellStart } from "@/lib/i18n/sections/sellStart";
import { frSiteHome } from "@/lib/i18n/sections/site/home";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { sellStart: frSellStart, site: { home: frSiteHome } } as const;

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

/** Whether a signed-in account already has a property: its sale to resume. */
async function hasSale(profileId: string | null): Promise<boolean> {
  if (!profileId) return false;
  const result = await sellerProperties(profileId);
  return result.ok && result.data.length > 0;
}

// /vendre (Younes, DECISIONS 2026-10-26): « Vendre » and « Vendre mon bien »
// lead here, to the two ways to start: the free analysis of value (the
// estimator, then « Créer mon annonce » from its result, L1-13b) or the
// listing straight away (the creation of the property, L1-11). A seller who
// has a property already finds the way back to their sale first.
// Design pass (DECISIONS 2026-11-26): the hero on the night of the home page,
// the two ways in cards over its bottom edge, the first one recommended
// with the reassurance line of the home page, then its three steps.
export default async function SellStartPage() {
  const profile = await getProfile();
  const resume = await hasSale(profile?.id ?? null);
  return (
    <PublicPage assistant header="night">
      <ShowcaseHero
        id="vendre"
        badge={{ text: t.badge, icon: Tag }}
        title={t.title}
        accent={t.accent}
        lead={t.lead}
      >
        {resume ? (
          <InlineAlert
            className="mt-6 max-w-140"
            action={
              <Link
                href={ROUTES.seller}
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                {t.resume.action}
              </Link>
            }
          >
            {t.resume.text}
          </InlineAlert>
        ) : null}
      </ShowcaseHero>
      {/* Over the bottom edge of the hero, as the search card of the home page. */}
      <div className="relative lk-frame -mt-8 max-md:[--lk-gutter:1rem] md:-mt-10 lg:-mt-12">
        <ul className="grid gap-3 md:grid-cols-2 md:gap-6">
          <ChoiceCard
            icon={ChartLine}
            title={t.valuation.title}
            text={t.valuation.text}
            note={fr.site.home.search.valuation.points.join(" · ")}
            action={{ href: ROUTES.valuation, label: t.valuation.action }}
            primary
          />
          <ChoiceCard
            icon={FilePlus2}
            title={t.direct.title}
            text={t.direct.text}
            action={{ href: directHref(profile !== null), label: t.direct.action }}
          />
        </ul>
      </div>
      <StepsSection />
      <div className="h-10 md:h-16" />
    </PublicPage>
  );
}
