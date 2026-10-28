"use client";

import type { KeyboardEvent, Ref } from "react";
import { X } from "lucide-react";
import type { MapListing } from "../map-listings";
import { IconButton } from "@/components/shared/icon-button";
import { ShowcaseCard } from "@/components/shared/showcase-card";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.search.map;

/**
 * The card of the pill chosen, over the map (L1-62, in the way of Airbnb):
 * the card of the list with its photos turning (lower, 3 by 2), the whole
 * card a link to the listing; « Fermer l'aperçu » over the photo, Escape
 * closes it too.
 */
export function MapPreview({
  listing,
  onClose,
  ref,
  className,
}: {
  listing: MapListing;
  onClose: () => void;
  ref?: Ref<HTMLElement>;
  className?: string;
}) {
  return (
    <section
      ref={ref}
      aria-label={t.preview}
      data-map-preview=""
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className={cn("rounded-lk-2xl bg-lk-surface shadow-lk-raised", className)}
    >
      <ShowcaseCard
        {...listing.card}
        framed
        swipe
        photoShape="wide"
        sizes="320px"
        action={
          <IconButton
            aria-label={t.closePreview}
            icon={X}
            variant="white-float"
            size="sm"
            onClick={onClose}
          />
        }
      />
    </section>
  );
}
