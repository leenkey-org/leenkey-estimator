import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { DpeBadge, type DpeClass } from "./dpe-badge";
import { FacadeDrawing } from "./facade-drawing";
import { Photo as PhotoImage } from "./photo";
import { NBSP, formatPrice, formatRooms, formatSurface } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type PropertyType = Database["public"]["Enums"]["property_type"];

export type PropertyCardData = {
  href: string;
  /** Price in cents (CLAUDE.md section 9). */
  priceCents: number;
  propertyType: PropertyType;
  rooms?: number | null;
  surfaceM2?: number | null;
  /** « Savigny-sur-Orge · centre ». */
  location: string;
  /** Wide card only, after the location: « 3e étage avec ascenseur ». */
  locationDetail?: string;
  dpe?: DpeClass | null;
  /** Without a photo, the card shows facade.svg on stone (DESIGN.md 7.1). */
  photo?: { src: string; alt: string } | null;
  /** Wide card: up to 3 strengths shown as tags. */
  highlights?: readonly string[];
  /** Last line: « Dossier complet » (success) or « Publié il y a 2 jours ». */
  note?: { text: string; tone?: "success" | "neutral" };
  /** Tile: badge on the photo. */
  badge?: "new" | "price-drop";
  /** Tile: photo counter « 1 / 9 ». */
  photoCount?: number;
};

export type PropertyCardProps = PropertyCardData & {
  variant: "compact" | "wide" | "tile";
  /** 44 × 44 button over the top right corner of the photo (favourite), outside the link. */
  action?: ReactNode;
  /** next/image sizes, when the tile width differs from the default grid. */
  sizes?: string;
  /** Tile: a 3:2 photo instead of the 120 px strip (public home page, wider tiles). */
  tallPhoto?: boolean;
  className?: string;
};

const SEPARATOR = `${NBSP}· `;

/** « Appartement 3 p · 68 m² », « Terrain · 450 m² », or « 3 p · 64 m² » without the type. */
function summary(card: PropertyCardData, roomsStyle: "long" | "short", withType: boolean) {
  const rooms = card.rooms ? formatRooms(card.rooms, roomsStyle) : null;
  const surface = card.surfaceM2 ? formatSurface(card.surfaceM2) : null;
  const head = withType
    ? [fr.propertyType[card.propertyType], rooms].filter(Boolean).join(" ")
    : rooms;
  return [head, surface].filter(Boolean).join(SEPARATOR);
}

function Photo({
  photo,
  sizes,
  className,
  children,
}: {
  photo: PropertyCardData["photo"];
  sizes: string;
  className: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-lk-stone-2", className)}>
      {photo ? (
        // A slow zoom of the photo on hover of the card (DESIGN.md 9).
        <span className="absolute inset-0 transition-transform duration-500 ease-out-lk group-hover:scale-[1.04]">
          <PhotoImage src={photo.src} alt={photo.alt} sizes={sizes} />
        </span>
      ) : (
        <div className="flex h-full items-center justify-center">
          <FacadeDrawing className="w-2/5 text-lk-ink-3" />
        </div>
      )}
      {children}
    </div>
  );
}

const cardLink =
  "group rounded-lk-md border border-lk-line bg-lk-surface transition-colors duration-140 ease-out-lk hover:border-lk-ink-3";

/**
 * Property card (docs/DESIGN.md 10.3): compact (mobile search), wide (desktop
 * search) and tile (home, similar properties). The whole card is a link; the
 * favourite button, when present, sits next to it over the photo.
 */
export function PropertyCard({
  variant,
  action,
  sizes,
  tallPhoto = false,
  className,
  ...card
}: PropertyCardProps) {
  const price = formatPrice(card.priceCents);
  const success = card.note?.tone === "success";

  let content: ReactNode;
  let actionPosition: string;

  if (variant === "compact") {
    actionPosition = "left-18 top-3.5";
    content = (
      <Link href={card.href} className={cn(cardLink, "flex gap-3 p-2.5")}>
        <Photo photo={card.photo} sizes={sizes ?? "110px"} className="h-24 w-27.5 rounded-lk-sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-lk-card-price font-bold text-wide tabular text-lk-ink">{price}</p>
            {card.dpe ? <DpeBadge value={card.dpe} compact /> : null}
          </div>
          <p className="text-lk-label font-semibold text-lk-ink">{summary(card, "short", true)}</p>
          <p className="truncate text-lk-caption text-lk-ink-3">{card.location}</p>
          {card.note ? (
            <p
              className={cn(
                "text-lk-micro",
                success ? "font-semibold text-lk-success" : "text-lk-ink-3",
              )}
            >
              {card.note.text}
            </p>
          ) : null}
        </div>
      </Link>
    );
  } else if (variant === "wide") {
    actionPosition = "left-41 top-4";
    content = (
      <Link href={card.href} className={cn(cardLink, "flex gap-4 p-3")}>
        <Photo photo={card.photo} sizes={sizes ?? "200px"} className="h-35 w-50 rounded-lk-sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <p className="text-lk-card-price-lg font-bold text-wide tabular text-lk-ink">{price}</p>
            {card.dpe ? <DpeBadge value={card.dpe} /> : null}
          </div>
          <p className="mt-1.5 text-lk-title font-semibold text-lk-ink">
            {summary(card, "long", true)}
          </p>
          <p className="mt-1 text-lk-secondary text-lk-ink-3">
            {card.locationDetail
              ? `${card.location}${SEPARATOR}${card.locationDetail}`
              : card.location}
          </p>
          {card.highlights?.length ? (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {card.highlights.slice(0, 3).map((highlight) => (
                <li
                  key={highlight}
                  className="rounded-lk-sm bg-lk-stone-2 px-2 py-1 text-lk-micro text-lk-ink-2"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          ) : null}
          {card.note ? (
            <p
              className={cn(
                "mt-auto flex items-center gap-1.5 pt-2.5 text-lk-caption",
                success ? "font-semibold text-lk-success" : "text-lk-ink-3",
              )}
            >
              {success ? (
                <Check aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.5} />
              ) : null}
              {card.note.text}
            </p>
          ) : null}
        </div>
      </Link>
    );
  } else {
    actionPosition = "right-2 top-2";
    const meta = [
      summary(card, "short", false),
      card.dpe ? `${fr.dpe.label}${NBSP}${card.dpe}` : null,
    ]
      .filter(Boolean)
      .join(SEPARATOR);
    content = (
      <Link href={card.href} className={cn(cardLink, "flex flex-col overflow-hidden")}>
        <Photo
          photo={card.photo}
          sizes={sizes ?? "(min-width: 1024px) 240px, (min-width: 768px) 33vw, 80vw"}
          className={cn("w-full", tallPhoto ? "aspect-3/2" : "h-30")}
        >
          {card.badge ? (
            <span
              className={cn(
                "absolute bottom-2 left-2 rounded-full px-2 py-1 text-lk-micro font-semibold text-white",
                card.badge === "new" ? "bg-lk-blue" : "bg-lk-success",
              )}
            >
              {card.badge === "new" ? fr.propertyCard.badgeNew : fr.propertyCard.badgePriceDrop}
            </span>
          ) : null}
          {card.photoCount ? (
            <span className="absolute bottom-2 right-2 rounded-full bg-lk-ink/80 px-2 py-1 text-lk-micro font-semibold tabular text-white">
              {fr.propertyCard.photoCount(card.photoCount)}
            </span>
          ) : null}
        </Photo>
        <div className="flex flex-col gap-1 px-3.5 py-3">
          <p className="text-lk-card-price-sm font-bold text-wide tabular text-lk-ink">{price}</p>
          <p className="text-lk-caption text-lk-ink-2">{meta}</p>
          <p className="truncate text-lk-caption text-lk-ink-3">{card.location}</p>
        </div>
      </Link>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {content}
      {action ? <div className={cn("absolute", actionPosition)}>{action}</div> : null}
    </div>
  );
}
