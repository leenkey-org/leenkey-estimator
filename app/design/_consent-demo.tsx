"use client";

import { ConsentBanner } from "@/components/shared/consent-banner";

/** The two views of the consent banner, in place, for the /design catalogue. */
export function ConsentDemo({ view }: { view: "banner" | "panel" }) {
  const noop = () => {};
  return (
    <ConsentBanner
      view={view}
      inline
      onAccept={noop}
      onRefuse={noop}
      onCustomize={noop}
      onSave={noop}
      className="max-w-105"
    />
  );
}
