import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireProfile } from "@/core/auth/session";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { StatusBadge } from "@/components/shared/status-badge";
import { listingSummary } from "@/leenkey/listings/presentation";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { creationStep, sellerProperties, type SellerProperty } from "@/leenkey/properties/queries";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../_components/space-page";

export const metadata: Metadata = { title: fr.spaces.seller.metaTitle };

function summary(property: SellerProperty): string {
  const { type, rooms, surfaceM2 } = property.characteristics;
  return type !== null && rooms !== null && surfaceM2 !== null
    ? listingSummary({ type, rooms, surfaceM2 })
    : fr.properties.list.untitled;
}

/** A draft resumes at its step; a listing sent or online opens from its page (L1-14). */
function resumeHref(property: SellerProperty): string | null {
  const status = property.listingStatus;
  if (status !== null && status !== "draft" && status !== "rejected") return null;
  return `/vendeur/biens/${property.id}/${creationStep(property)}`;
}

// Until the seller dashboard (L1-24): the properties of the seller, a draft
// resumed where it stopped, and « Créer mon annonce » (L1-11). The bell sits
// at the top of the page on mobile (SPEC-V2 section 10, DECISIONS Q26), in
// the TopNav from 768 px.
export default async function SellerHomePage() {
  const profile = await requireProfile();
  const t = fr.spaces.seller;
  const list = fr.properties.list;
  const result = await sellerProperties(profile.id);

  return (
    <SpacePage title={fr.spaces.greeting(profile.firstName)} roles={profile.roles}>
      {!result.ok ? (
        <InlineAlert tone="danger" className="mt-6">
          {list.error}
        </InlineAlert>
      ) : result.data.length === 0 ? (
        <EmptyState
          className="mt-12"
          title={t.title}
          description={t.text}
          action={
            <Button asChild>
              <Link href={ROUTES.newProperty}>{list.create}</Link>
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="vos-biens" className="mt-8 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="vos-biens" className="text-lk-h3 font-semibold text-lk-ink">
              {list.title}
            </h2>
            <Button asChild variant="secondary" size="sm">
              <Link href={ROUTES.newProperty}>{list.create}</Link>
            </Button>
          </div>
          <ul className="flex flex-col divide-y divide-lk-line rounded-lk-md border border-lk-line bg-lk-surface">
            {result.data.map((property) => {
              const href = resumeHref(property);
              const name = summary(property);
              const content = (
                <>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-lk-compact font-semibold text-lk-ink">
                      {href ? <span className="sr-only">{`${list.resume} : `}</span> : null}
                      {name}
                    </p>
                    <p className="truncate text-lk-caption text-lk-ink-3">
                      {property.address.line} · {property.address.city}
                    </p>
                  </div>
                  <StatusBadge status={property.listingStatus ?? "draft"} />
                  {href ? (
                    <ChevronRight aria-hidden="true" className="size-4 text-lk-ink-3" />
                  ) : null}
                </>
              );
              return (
                <li key={property.id}>
                  {href ? (
                    <Link
                      href={href}
                      className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-lk-stone-2"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex min-h-16 items-center gap-3 px-4 py-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </SpacePage>
  );
}
