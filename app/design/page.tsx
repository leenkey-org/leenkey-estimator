import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bell, ChevronLeft, Heart, Plus, Settings, Sparkles, X } from "lucide-react";
import * as content from "./_content";
import { ConsentDemo } from "./_consent-demo";
import { FilterSelectDemo } from "./_filter-select-demo";
import { AccountMenu } from "@/components/shared/account-menu";
import { AppHeader } from "@/components/shared/app-header";
import { AdminMobileHeader } from "@/components/shared/admin-mobile-header";
import { AdminSidebar } from "@/components/shared/admin-sidebar";
import { BottomNav } from "@/components/shared/bottom-nav";
import { BrandPanel } from "@/components/shared/brand-panel";
import { Button } from "@/components/shared/button";
import { Checkbox } from "@/components/shared/checkbox";
import { ChipButton, ChipToggle } from "@/components/shared/chip-toggle";
import { ComingSoon } from "@/components/shared/coming-soon";
import { ContactCard } from "@/components/shared/contact-card";
import {
  DataTable,
  DataTableActions,
  DataTableCell,
  DataTableHeader,
  DataTableRow,
  DataTableRowHeader,
} from "@/components/shared/data-table";
import { DPE_CLASSES, DpeBadge } from "@/components/shared/dpe-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FacadeDrawing } from "@/components/shared/facade-drawing";
import { FacadeRoot } from "@/components/shared/facade-root";
import { FilterPills } from "@/components/shared/filter-pills";
import { FormActionBar } from "@/components/shared/form-action-bar";
import { Gallery } from "@/components/shared/gallery";
import { IconButton } from "@/components/shared/icon-button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { KeyFactsTable } from "@/components/shared/key-facts-table";
import { KeyFigures } from "@/components/shared/key-figures";
import { NotificationBell } from "@/components/shared/notification-bell";
import { PriceBlock } from "@/components/shared/price-block";
import { ProgressBar } from "@/components/shared/progress-bar";
import { PropertyCard } from "@/components/shared/property-card";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { RoleCards } from "@/components/shared/role-cards";
import { SectionTitle } from "@/components/shared/section-title";
import { SegmentedPicker } from "@/components/shared/segmented-picker";
import { SiteFooter } from "@/components/shared/site-footer";
import { Select } from "@/components/shared/select";
import { Skeleton } from "@/components/shared/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Textarea } from "@/components/shared/textarea";
import { TopNav } from "@/components/shared/top-nav";
import { FavoriteButton } from "@/leenkey/favorites/components/favorite-button";
import { UnitInput } from "@/components/shared/unit-input";
import { signOut } from "@/leenkey/auth/actions";
import {
  accountMenu,
  ADMIN_NAV_ITEMS,
  bottomTabs,
  FAVOURITES_LINK,
  notificationBell,
  sellCta,
  signInLink,
  TOP_NAV_LINKS,
} from "@/leenkey/navigation/config";
import { isProduction } from "@/lib/env";
import {
  formatDate,
  formatDateTime,
  formatPrice,
  formatPricePerSquareMetre,
  formatPriceShort,
  formatRelative,
  formatRooms,
  formatSurface,
} from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// Living catalogue of the Façade design system (docs/DESIGN.md 12.14): the
// board of Main.png with the real components, then every component of
// components/shared. Local and preprod only.

// Nothing about the catalogue leaks into the production 404.
export const metadata: Metadata = isProduction()
  ? {}
  : { title: content.page.metaTitle, robots: { index: false, follow: false } };

const LISTING_STATUSES = [
  "draft",
  "pending",
  "published",
  "paused",
  "suspended",
  "sold",
  "rejected",
] as const;
const PLANS = ["autonomie", "accompagne", "serenite"] as const;
const SPACES = ["seller", "buyer", "admin"] as const;
const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "outline-ink",
  "ghost",
  "on-dark",
  "success",
  "danger",
] as const;

function Section({
  id,
  title,
  level = "h2",
  children,
  className,
}: {
  id: string;
  title: string;
  level?: "h2" | "h3";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-4", className)}>
      <SectionTitle as={level} id={id}>
        {title}
      </SectionTitle>
      {children}
    </section>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return <p className="text-lk-caption text-lk-ink-3">{children}</p>;
}

function SwatchTile({ swatch }: { swatch: content.Swatch }) {
  const style: CSSProperties = { backgroundColor: `var(--color-${swatch.token})` };
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="h-14 rounded-lk-sm border border-lk-line" style={style} />
      <div className="min-w-0">
        <p className="truncate text-lk-label font-semibold text-lk-ink">{swatch.name}</p>
        <p className="text-lk-caption tabular text-lk-ink-3">{swatch.hex}</p>
        <p className="truncate text-lk-caption text-lk-ink-3">{swatch.token}</p>
      </div>
    </div>
  );
}

function BlueFlat({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lk-md bg-lk-blue p-6 text-white", className)}>{children}</div>;
}

export default function DesignPage() {
  if (isProduction()) notFound();

  const now = content.formats.now;
  const formatRows: Array<[string, string]> = [
    [content.formats.rows.price, formatPrice(35_000_000)],
    [content.formats.rows.priceShort, formatPriceShort(35_000_000)],
    [content.formats.rows.surface, formatSurface(68)],
    [content.formats.rows.pricePerSquareMetre, formatPricePerSquareMetre(35_000_000, 68)],
    [content.formats.rows.rooms, formatRooms(3)],
    [content.formats.rows.roomsShort, formatRooms(3, "short")],
    [content.formats.rows.date, formatDate("2026-09-22T10:00:00Z", now)],
    [content.formats.rows.dateTime, formatDateTime("2026-10-03T08:00:00Z", now)],
    [content.formats.rows.relative, formatRelative("2026-10-15T10:00:00Z", now)],
  ];

  return (
    <FacadeRoot className="min-h-screen">
      <main className="mx-auto flex max-w-lk-page flex-col gap-16 px-5 pb-24 pt-10 md:px-10">
        <header className="flex flex-col gap-3 border-b border-lk-line pb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <h1 className="text-lk-h1 font-bold text-wide lg:text-lk-h1-lg">{content.page.title}</h1>
          <p className="text-lk-secondary text-lk-ink-3 lg:max-w-lk-form lg:text-right">
            {content.page.subtitle}
          </p>
        </header>

        {/* Board of DESIGN.md 12.14 (Main.png) */}
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-12">
            <Section id="couleurs" title={content.sections.colors}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {content.boardSwatches.map((swatch) => (
                  <SwatchTile key={swatch.token} swatch={swatch} />
                ))}
              </div>
            </Section>

            <Section id="typographie" title={content.sections.typography}>
              <div className="flex flex-col gap-3 rounded-lk-md border border-lk-line p-6">
                <p className="text-lk-h1 font-bold text-wide lg:text-lk-h1-lg">
                  {content.boardType.h1}
                </p>
                <p className="text-lk-h2 font-bold text-wide lg:text-lk-h2-lg">
                  {content.boardType.h2}
                </p>
                <p className="text-lk-h3 font-semibold lg:text-lk-h3-lg">{content.boardType.h3}</p>
                <p className="text-lk-body lg:text-lk-body-lg">{content.boardType.body}</p>
                <p className="text-lk-secondary text-lk-ink-3">{content.boardType.secondary}</p>
                <p className="text-lk-tag font-semibold text-lk-blue">{content.boardType.tag}</p>
              </div>
            </Section>
          </div>

          <div className="flex flex-col gap-12">
            <Section id="boutons" title={content.sections.buttons}>
              <div className="flex flex-wrap items-center gap-3">
                <Button>{content.buttons.publish}</Button>
                <Button variant="secondary">{content.buttons.secondary}</Button>
                <Button variant="ghost">{content.buttons.ghost}</Button>
                <Button variant="on-dark">{content.buttons.onDark}</Button>
                <Button variant="secondary" size="sm">
                  {content.buttons.small}
                </Button>
              </div>
            </Section>

            <Section id="champs" title={content.sections.fields}>
              <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
                <Input
                  label={content.fields.address.label}
                  defaultValue={content.fields.address.value}
                  autoComplete="street-address"
                />
                <UnitInput
                  label={content.fields.price.label}
                  unit={content.fields.price.unit}
                  defaultValue={content.fields.price.value}
                  inputMode="numeric"
                />
                <Select label={content.fields.dpe.label} defaultValue="C">
                  {DPE_CLASSES.map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </Select>
                <UnitInput
                  label={content.fields.surface.label}
                  unit={content.fields.surface.unit}
                  error={content.fields.surface.error}
                  inputMode="decimal"
                />
              </div>
            </Section>

            <Section id="statuts" title={content.sections.statuses}>
              <div className="flex flex-wrap gap-2">
                {LISTING_STATUSES.map((status) => (
                  <StatusBadge key={status} status={status} />
                ))}
              </div>
            </Section>

            <Section id="carte-de-bien" title={content.sections.card}>
              <PropertyCard
                variant="compact"
                {...content.exampleCards.savigny}
                note={content.compactNote}
                className="md:hidden"
              />
              <PropertyCard
                variant="wide"
                {...content.exampleCards.savigny}
                className="hidden md:block"
              />
            </Section>
          </div>
        </div>

        {/* Every component of components/shared (DESIGN.md section 10) */}
        <section
          aria-labelledby="catalogue"
          className="flex flex-col gap-12 border-t border-lk-line pt-12"
        >
          <div className="flex flex-col gap-2">
            <h2 id="catalogue" className="text-lk-h2 font-bold text-wide lg:text-lk-h2-lg">
              {content.page.catalogueTitle}
            </h2>
            <p className="max-w-lk-prose text-lk-body text-lk-ink-2">
              {content.page.catalogueIntro}
            </p>
          </div>

          <Section id="palette" title={content.sections.palette} level="h3">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {content.paletteSwatches.map((swatch) => (
                <SwatchTile key={swatch.token} swatch={swatch} />
              ))}
            </div>
            <Caption>{content.sections.dpe}</Caption>
            <div className="flex flex-wrap gap-2">
              {DPE_CLASSES.map((letter) => (
                <DpeBadge key={letter} value={letter} />
              ))}
            </div>
          </Section>

          <Section id="echelle" title={content.sections.typeScale} level="h3">
            <div className="divide-y divide-lk-line rounded-lk-md border border-lk-line">
              {content.typeScale.map((role) => (
                <div
                  key={role.role}
                  className="grid gap-2 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6 lg:p-5"
                >
                  <p className={cn("min-w-0 text-lk-ink", role.sampleClassName ?? role.classes)}>
                    {role.sample}
                  </p>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-lk-label font-semibold text-lk-ink">{role.role}</p>
                    <p className="text-lk-caption text-lk-ink-3">{role.spec}</p>
                    <p className="break-words text-lk-caption text-lk-ink-2">{role.classes}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="variantes" title={content.sections.buttonVariants} level="h3">
            <div className="flex flex-wrap items-center gap-3">
              {BUTTON_VARIANTS.map((variant) => (
                <Button key={variant} variant={variant}>
                  {content.buttons.variants[variant]}
                </Button>
              ))}
              <Button variant="ghost" muted>
                {content.buttons.variants.ghostMuted}
              </Button>
            </div>
            <BlueFlat className="flex flex-wrap items-center gap-4">
              <Button variant="inverse">{content.buttons.variants.inverse}</Button>
              <p className="text-lk-secondary text-lk-on-blue-2">{content.buttons.onBlueCaption}</p>
            </BlueFlat>
          </Section>

          <Section id="tailles" title={content.sections.buttonSizes} level="h3">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg">{content.buttons.sizes.lg}</Button>
              <Button size="md">{content.buttons.sizes.md}</Button>
              <Button size="sm">{content.buttons.sizes.sm}</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button icon={Plus}>{content.buttons.withIcon}</Button>
              <Button variant="secondary" disabled>
                {content.buttons.disabled}
              </Button>
              <Button loading>{content.buttons.loading}</Button>
              <Button variant="outline-ink" asChild>
                <Link href="/design#tailles">{content.buttons.link}</Link>
              </Button>
            </div>
            <div className="flex gap-2.5">
              <Button variant="secondary" size="lg" className="flex-1">
                {content.buttons.variants.secondary}
              </Button>
              <Button size="lg" className="flex-[1.4]">
                {content.buttons.variants.primary}
              </Button>
            </div>
          </Section>

          <Section id="boutons-icone" title={content.sections.iconButtons} level="h3">
            <div className="flex flex-wrap items-center gap-3">
              <IconButton icon={ChevronLeft} aria-label={content.iconButtons.stone} />
              <IconButton
                icon={Heart}
                variant="white-float"
                aria-label={content.iconButtons.whiteFloat}
              />
              <IconButton icon={Bell} variant="tint" aria-label={content.iconButtons.tint} />
              <IconButton icon={X} variant="outline" aria-label={content.iconButtons.outline} />
              <IconButton
                icon={Heart}
                variant="transparent"
                aria-label={content.iconButtons.transparent}
              />
              <IconButton
                icon={Settings}
                variant="transparent"
                size="sm"
                aria-label={content.iconButtons.small}
              />
              <div className="rounded-lk-md bg-lk-navy p-3">
                <IconButton
                  icon={Sparkles}
                  variant="on-dark"
                  aria-label={content.iconButtons.onDark}
                />
              </div>
            </div>
          </Section>

          <Section id="saisie" title={content.sections.inputs} level="h3">
            <div className="grid max-w-lk-form gap-3.5">
              <Input
                label={content.fields.phone.label}
                optional
                type="tel"
                autoComplete="tel"
                placeholder={content.fields.phone.placeholder}
                help={content.fields.phone.help}
              />
              <Input
                label={content.fields.password.label}
                type="password"
                autoComplete="new-password"
                placeholder={content.fields.password.placeholder}
                error={content.fields.password.error}
              />
              <Select
                label={content.fields.type.label}
                placeholder={content.fields.type.placeholder}
                defaultValue=""
              >
                {content.fields.type.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <UnitInput
                label={content.fields.charges.label}
                unit={content.fields.charges.unit}
                defaultValue={content.fields.charges.value}
                inputMode="numeric"
              />
              <Input
                label={content.fields.search.label}
                defaultValue={content.fields.search.value}
                compact
              />
              <Input
                label={content.fields.disabled.label}
                defaultValue={content.fields.disabled.value}
                disabled
              />
            </div>
          </Section>

          <Section id="selections" title={content.sections.choices} level="h3">
            <div className="flex flex-col gap-1.5">
              <p className="text-lk-label font-medium text-lk-ink">
                {content.choices.amenitiesLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {content.choices.amenities.map((chip) => (
                  <ChipToggle key={chip.label} defaultPressed={chip.pressed}>
                    {chip.label}
                  </ChipToggle>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Caption>{content.choices.filtersLabel}</Caption>
              <div className="flex flex-wrap gap-2">
                {content.choices.filters.map((chip) => (
                  <ChipToggle key={chip.label} defaultPressed={chip.pressed} compact>
                    {chip.label}
                  </ChipToggle>
                ))}
              </div>
            </div>
            <div className="grid max-w-lk-form gap-3.5">
              <SegmentedPicker
                label={content.choices.dpeLabel}
                defaultValue="C"
                options={DPE_CLASSES.map((letter) => ({
                  value: letter,
                  label: letter,
                  ariaLabel: content.choices.dpeAria(letter),
                }))}
              />
              <SegmentedPicker
                label={content.choices.financingLabel}
                defaultValue={content.choices.financing[0].value}
                options={content.choices.financing}
              />
            </div>
            <div className="flex max-w-lk-form flex-col gap-1.5">
              <Caption>{content.choices.roleCaption}</Caption>
              <RoleCards
                name="design-role"
                legend={content.choices.roleLegend}
                options={content.choices.roles}
                defaultValue="seller"
              />
            </div>
          </Section>

          <Section id="cases-a-cocher" title={content.sections.checkboxes} level="h3">
            <div className="flex max-w-lk-form flex-col gap-4">
              <Checkbox label={content.choices.checkboxLabel} />
              <Checkbox label={content.choices.checkboxCheckedLabel} defaultChecked />
              <Checkbox
                label={content.choices.checkboxLabel}
                error={content.choices.checkboxError}
              />
            </div>
          </Section>

          <Section id="filtres" title={content.sections.filters} level="h3">
            <Caption>{content.filterBar.selectCaption}</Caption>
            <div className="flex flex-wrap items-center gap-3">
              <FilterSelectDemo {...content.filterBar.type} />
              <FilterSelectDemo {...content.filterBar.budget} />
              <FilterSelectDemo {...content.filterBar.rooms} />
              <Button
                variant="outline-ink"
                className="shrink-0 whitespace-nowrap px-3.5 text-lk-label"
              >
                {content.filterBar.more}
              </Button>
            </div>
            <Caption>{content.filterBar.chipCaption}</Caption>
            <div className="flex flex-wrap gap-2">
              {content.filterBar.chips.map((label) => (
                <ChipButton key={label} compact>
                  {label}
                </ChipButton>
              ))}
            </div>
          </Section>

          <Section id="pastilles" title={content.sections.badges} level="h3">
            <Caption>{content.statuses.listingCaption}</Caption>
            <div className="flex flex-wrap gap-2">
              {LISTING_STATUSES.map((status) => (
                <StatusBadge key={status} status={status} />
              ))}
            </div>
            <Caption>{content.statuses.planCaption}</Caption>
            <div className="flex flex-wrap gap-2">
              {PLANS.map((plan) => (
                <StatusBadge key={plan} plan={plan} />
              ))}
            </div>
            <Caption>{content.statuses.dpeCaption}</Caption>
            <div className="flex flex-wrap items-center gap-2">
              <DpeBadge value="C" />
              <DpeBadge value="C" compact />
              <DpeBadge value="F" compact />
            </div>
          </Section>

          <Section id="titre-de-section" title={content.sections.sectionTitle} level="h3">
            <div className="flex max-w-lk-form flex-col gap-4">
              <SectionTitle as="h4">{content.sectionTitle.plain}</SectionTitle>
              <SectionTitle
                as="h4"
                action={
                  <Link
                    href="/design#titre-de-section"
                    className="text-lk-label font-semibold text-lk-blue underline underline-offset-2"
                  >
                    {content.sectionTitle.action}
                  </Link>
                }
              >
                {content.sectionTitle.withAction}
              </SectionTitle>
            </div>
          </Section>

          <Section id="chiffres-cles" title={content.sections.keyFigures} level="h3">
            <KeyFigures items={content.keyFigures} className="max-w-lk-settings" />
            <Caption>{content.keyFiguresCaption}</Caption>
          </Section>

          <Section id="galerie" title={content.sections.gallery} level="h3">
            <Gallery
              photos={content.galleryPhotos}
              topLeft={
                <IconButton
                  icon={ChevronLeft}
                  variant="white-float"
                  aria-label={content.gallery.back}
                />
              }
              className="overflow-hidden rounded-lk-md lg:rounded-none"
            />
            <Caption>{content.gallery.caption}</Caption>
            <Gallery photos={[]} className="overflow-hidden rounded-lk-md lg:rounded-none" />
            <Caption>{content.gallery.noPhotoCaption}</Caption>
            <div className="flex items-end gap-4">
              <PropertyThumb className="size-14" />
              <PropertyThumb className="h-11 w-14" />
              <PropertyThumb className="size-11" />
            </div>
            <Caption>{content.gallery.thumbsCaption}</Caption>
          </Section>

          <Section id="prix" title={content.sections.price} level="h3">
            <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
              <div className="flex flex-col gap-2">
                <PriceBlock
                  priceCents={content.price.priceCents}
                  surfaceM2={content.price.surfaceM2}
                />
                <Caption>{content.price.mdCaption}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <PriceBlock
                  priceCents={content.price.priceCents}
                  surfaceM2={content.price.surfaceM2}
                  size="lg"
                />
                <Caption>{content.price.lgCaption}</Caption>
              </div>
            </div>
          </Section>

          <Section id="vendeur" title={content.sections.contact} level="h3">
            <div className="grid max-w-lk-settings gap-x-4 gap-y-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <ContactCard firstName={content.contact.firstName} accompanied />
                <Caption>{content.contact.cardCaption}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <ContactCard firstName={content.contact.otherFirstName} accompanied={false} />
                <Caption>{content.contact.freeCaption}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <ContactCard firstName={content.contact.firstName} accompanied variant="tile" />
                <Caption>{content.contact.tileCaption}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <ContactCard firstName={null} accompanied={false} variant="tile" />
                <Caption>{content.contact.unknownCaption}</Caption>
              </div>
            </div>
          </Section>

          <Section id="caracteristiques" title={content.sections.keyFacts} level="h3">
            <KeyFactsTable
              className="max-w-lk-prose"
              items={[
                ...content.keyFacts.items,
                {
                  label: content.keyFacts.linkLabel,
                  value: (
                    <Link
                      href="/design#caracteristiques"
                      className="underline underline-offset-2 hover:no-underline"
                    >
                      {content.keyFacts.linkValue}
                    </Link>
                  ),
                  tone: "link",
                },
              ]}
            />
            <Caption>{content.keyFacts.caption}</Caption>
          </Section>

          <Section id="cartes" title={content.sections.cards} level="h3">
            <Caption>{content.cardCaptions.compact}</Caption>
            <div className="grid gap-3 md:grid-cols-2">
              <PropertyCard
                variant="compact"
                {...content.exampleCards.savigny}
                note={content.compactNote}
              />
              <PropertyCard variant="compact" {...content.exampleCards.epinay} />
            </div>
            <div className="hidden flex-col gap-3.5 md:flex">
              <Caption>{content.cardCaptions.wide}</Caption>
              <PropertyCard
                variant="wide"
                {...content.exampleCards.savigny}
                className="max-w-155"
              />
              <PropertyCard variant="wide" {...content.exampleCards.epinay} className="max-w-155" />
            </div>
            <Caption>{content.cardCaptions.tile}</Caption>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <PropertyCard
                variant="tile"
                {...content.exampleCards.juvisy}
                action={
                  <FavoriteButton
                    listingId={content.cardCaptions.favouriteListingId}
                    favorite={false}
                    checkedAt={0}
                    signUpHref="/design#cartes"
                  />
                }
              />
              <PropertyCard variant="tile" {...content.exampleCards.morsang} />
              <PropertyCard variant="tile" {...content.exampleCards.epinay} />
            </div>
            <Caption>{content.cardCaptions.noPhoto}</Caption>
            <div className="flex flex-wrap items-center gap-3 rounded-lk-md bg-lk-stone-2 p-3">
              <FavoriteButton
                listingId={content.cardCaptions.favouriteListingId}
                favorite={null}
                checkedAt={0}
                signUpHref="/design#cartes"
              />
              <FavoriteButton
                listingId={content.cardCaptions.favouriteListingId}
                favorite={false}
                checkedAt={0}
                signUpHref="/design#cartes"
              />
              <FavoriteButton
                listingId={`${content.cardCaptions.favouriteListingId.slice(0, -1)}1`}
                favorite
                checkedAt={0}
                signUpHref="/design#cartes"
              />
              <FavoriteButton
                listingId={`${content.cardCaptions.favouriteListingId.slice(0, -1)}1`}
                favorite
                checkedAt={0}
                signUpHref="/design#cartes"
                variant="stone"
              />
            </div>
            <Caption>{content.cardCaptions.favourite}</Caption>
          </Section>

          <Section id="aplat" title={content.sections.brandPanel} level="h3">
            <Caption>{content.brandPanel.pageCaption}</Caption>
            <BrandPanel
              titleAs="h4"
              titleSize="page"
              title={content.brandPanel.blueTitle}
              description={content.brandPanel.blueText}
              illustration
            />
            <BrandPanel
              variant="navy"
              titleAs="h4"
              titleSize="page"
              title={content.brandPanel.navyTitle}
              description={content.brandPanel.navyText}
            />
            <Caption>{content.brandPanel.heroCaption}</Caption>
            <BrandPanel
              titleAs="h4"
              title={content.brandPanel.heroTitle}
              description={content.brandPanel.heroText}
              illustration
            />
          </Section>

          <Section id="dessin" title={content.sections.drawing} level="h3">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-lk-md border border-lk-line p-6">
                <FacadeDrawing className="h-auto w-full max-w-95 text-lk-ink-3" />
                <Caption>{content.drawing.lightCaption}</Caption>
              </div>
              <BlueFlat className="flex flex-col gap-3">
                <FacadeDrawing className="h-auto w-full max-w-95 opacity-55" />
                <p className="text-lk-caption text-lk-on-blue-2">{content.drawing.blueCaption}</p>
              </BlueFlat>
              <div className="flex flex-col gap-3 rounded-lk-md border border-lk-line p-6">
                <span
                  aria-hidden="true"
                  className="block aspect-[380/210] w-full max-w-95 bg-lk-ink-3 [mask:url(/brand/facade.svg)_center/contain_no-repeat]"
                />
                <Caption>{content.drawing.fileCaption}</Caption>
              </div>
              <BlueFlat className="flex flex-col gap-3">
                <span
                  aria-hidden="true"
                  className="block aspect-[380/210] w-full max-w-95 bg-white opacity-55 [mask:url(/brand/facade.svg)_center/contain_no-repeat]"
                />
                <p className="text-lk-caption text-lk-on-blue-2">{content.drawing.fileCaption}</p>
              </BlueFlat>
            </div>
          </Section>

          <Section id="etat-vide" title={content.sections.emptyState} level="h3">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lk-md bg-lk-bg px-5 py-10">
                <EmptyState
                  titleAs="h4"
                  title={content.emptyStates.light.title}
                  description={content.emptyStates.light.text}
                  action={<Button>{content.emptyStates.light.action}</Button>}
                />
              </div>
              <BlueFlat className="px-5 py-10">
                <EmptyState
                  tone="blue"
                  titleAs="h4"
                  title={content.emptyStates.blue.title}
                  description={content.emptyStates.blue.text}
                  action={<Button variant="inverse">{content.emptyStates.blue.action}</Button>}
                />
              </BlueFlat>
            </div>
          </Section>

          <Section id="a-venir" title={content.sections.comingSoon} level="h3">
            <div className="rounded-lk-md bg-lk-bg px-5">
              <ComingSoon
                titleAs="h4"
                title={fr.placeholders.messages.comingTitle}
                text={fr.placeholders.messages.comingText}
              />
            </div>
            <Caption>{content.comingSoon.caption}</Caption>
          </Section>

          <Section id="formulaire-a-etapes" title={content.sections.stepForm} level="h3">
            <div className="overflow-hidden rounded-lk-md border border-lk-line bg-lk-bg">
              <AppHeader
                titleAs="h4"
                title={content.stepForm.title}
                back={<IconButton icon={ChevronLeft} aria-label={content.stepForm.back} />}
                action={
                  <Button variant="ghost" size="sm">
                    {content.stepForm.save}
                  </Button>
                }
                progress={<ProgressBar label={content.stepForm.progress} value={50} />}
              />
              <div className="px-5 pb-5">
                <FormActionBar className="static mx-0 mt-8 px-0 pb-0">
                  <Button variant="secondary">{content.stepForm.previous}</Button>
                  <Button>{content.stepForm.next}</Button>
                </FormActionBar>
              </div>
            </div>
            <Caption>{content.stepForm.caption}</Caption>
          </Section>

          <Section id="navigation" title={content.sections.navigation} level="h3">
            <div className="overflow-x-auto rounded-lk-md border border-lk-line">
              <TopNav
                className="flex min-w-4xl border-b-0"
                homeHref="/design#navigation"
                label={content.navigation.labels.topSignedIn}
                links={TOP_NAV_LINKS}
                activeHref={TOP_NAV_LINKS[0].href}
                cta={sellCta(true)}
                account={{
                  signedIn: true,
                  notifications: <NotificationBell {...notificationBell("buyer")} size="nav" />,
                  favourites: FAVOURITES_LINK,
                  menu: { ...accountMenu(content.navigation.buyer), signOut },
                }}
              />
            </div>
            <Caption>{content.navigation.topSignedInCaption}</Caption>
            <div className="overflow-x-auto rounded-lk-md border border-lk-line">
              <TopNav
                className="flex min-w-4xl border-b-0"
                homeHref="/design#navigation"
                label={content.navigation.labels.topSignedOut}
                links={TOP_NAV_LINKS}
                activeHref={TOP_NAV_LINKS[0].href}
                cta={sellCta(false)}
                account={{ signedIn: false, ...signInLink("/design") }}
              />
            </div>
            <Caption>{content.navigation.topSignedOutCaption}</Caption>
            <div className="grid gap-4 md:grid-cols-3">
              {SPACES.map((space) => {
                const tabs = bottomTabs(space);
                return (
                  <div key={space} className="flex flex-col gap-2">
                    <BottomNav
                      inline
                      className="rounded-lk-md border md:block"
                      label={content.navigation.labels[space]}
                      items={tabs}
                      activeHref={tabs[0].href}
                    />
                    <Caption>{content.navigation.bottomCaptions[space]}</Caption>
                  </div>
                );
              })}
            </div>
            <div className="grid items-start gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
              <div className="flex flex-col gap-2">
                <AdminSidebar
                  className="h-140 rounded-lk-md"
                  label={content.navigation.labels.sidebar}
                  homeHref="/design#navigation"
                  items={ADMIN_NAV_ITEMS.map((item) => ({
                    ...item,
                    count: content.navigation.counts[item.href],
                  }))}
                  activeHref={ADMIN_NAV_ITEMS[1].href}
                  account={{
                    ...accountMenu(content.navigation.admin),
                    signOut,
                    name: content.navigation.admin.firstName,
                    role: fr.nav.admin.role,
                  }}
                />
                <Caption>{content.navigation.sidebarCaption}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <AdminMobileHeader
                  className="max-w-97.5 rounded-lk-md md:flex"
                  items={ADMIN_NAV_ITEMS}
                  title={ADMIN_NAV_ITEMS[1].label}
                  fallbackTitle={fr.nav.backOffice}
                  account={{ ...accountMenu(content.navigation.admin), signOut }}
                />
                <Caption>{content.navigation.headerCaption}</Caption>
              </div>
            </div>
          </Section>

          <Section id="notifications" title={content.sections.notifications} level="h3">
            <div className="flex flex-wrap items-center gap-4">
              <NotificationBell {...notificationBell("buyer")} size="nav" />
              <NotificationBell
                {...notificationBell("seller")}
                count={content.notifications.unread}
                size="nav"
              />
              <div className="rounded-lk-md bg-lk-navy p-3">
                <NotificationBell {...notificationBell("seller")} tone="dark" />
              </div>
            </div>
            <Caption>{content.notifications.bellCaption}</Caption>
            <div className="flex flex-wrap items-center gap-4">
              <AccountMenu {...accountMenu(content.navigation.buyer)} signOut={signOut} />
              <div className="rounded-lk-md bg-lk-ink p-3">
                <AccountMenu
                  {...accountMenu(content.navigation.admin)}
                  signOut={signOut}
                  variant="header"
                />
              </div>
            </div>
            <Caption>{content.notifications.menuCaption}</Caption>
          </Section>

          <Section id="alertes" title={content.sections.alerts} level="h3">
            <div className="flex max-w-lk-prose flex-col gap-3">
              <InlineAlert
                tone="danger"
                action={
                  <Link
                    href="/design#alertes"
                    className="font-semibold underline underline-offset-2 hover:no-underline"
                  >
                    {content.alerts.retry}
                  </Link>
                }
              >
                {content.alerts.danger}
              </InlineAlert>
              <InlineAlert tone="warning">{content.alerts.warning}</InlineAlert>
              <InlineAlert tone="info">{content.alerts.info}</InlineAlert>
              <InlineAlert tone="success">{content.alerts.success}</InlineAlert>
            </div>
            <Caption>{content.alerts.caption}</Caption>
          </Section>

          <Section id="back-office" title={content.sections.backOffice} level="h3">
            <FilterPills
              label={content.backOffice.pillsLabel}
              items={content.backOffice.pills.map((pill) => ({
                ...pill,
                href: "/design#back-office",
              }))}
            />
            <Caption>{content.backOffice.pillsCaption}</Caption>
            <DataTable label={content.backOffice.tableLabel}>
              <DataTableHeader columns={content.backOffice.columns} />
              {content.backOffice.rows.map((row) => (
                <tbody key={row.title} className="border-t border-lk-line">
                  <DataTableRow className="border-t-0">
                    <DataTableRowHeader>
                      <div className="flex flex-col">
                        <span className="font-semibold">{row.title}</span>
                        <span className="text-lk-caption text-lk-ink-3">{row.place}</span>
                      </div>
                    </DataTableRowHeader>
                    <DataTableCell>{row.seller}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap tabular">
                      {formatPrice(row.priceCents)}
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge plan={row.plan} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-lk-ink-2">
                      {row.received}
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge status={row.status} />
                    </DataTableCell>
                  </DataTableRow>
                  <DataTableActions columns={content.backOffice.columns.length}>
                    <Button variant="ghost" size="sm">
                      {content.backOffice.open}
                    </Button>
                    <Button variant="secondary" size="sm">
                      {content.backOffice.reject}
                    </Button>
                    <Button variant="success" size="sm">
                      {content.backOffice.publish}
                    </Button>
                  </DataTableActions>
                </tbody>
              ))}
            </DataTable>
            <Caption>{content.backOffice.tableCaption}</Caption>
            <Textarea
              label={content.backOffice.textarea.label}
              help={content.backOffice.textarea.help}
              defaultValue={content.backOffice.textarea.value}
              containerClassName="max-w-lk-form"
            />
          </Section>

          <Section id="chargement" title={content.sections.skeleton} level="h3">
            <div className="grid max-w-lk-settings gap-3 md:grid-cols-2">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="flex gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-2.5"
                >
                  <Skeleton className="size-24 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-3.5 w-4/5" />
                    <Skeleton className="h-3.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
            <Caption>{content.skeleton.caption}</Caption>
          </Section>

          <Section id="consentement" title={content.sections.consent} level="h3">
            <div className="flex flex-wrap items-start gap-6">
              <div className="flex flex-col gap-2">
                <ConsentDemo view="banner" />
                <Caption>{content.consent.bannerCaption}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <ConsentDemo view="panel" />
                <Caption>{content.consent.panelCaption}</Caption>
              </div>
            </div>
          </Section>

          <Section id="pied-de-page" title={content.sections.footer} level="h3">
            <SiteFooter className="rounded-lk-md border border-lk-line" />
            <Caption>{content.footer.caption}</Caption>
          </Section>

          <Section id="formats" title={content.sections.formats} level="h3">
            <dl className="max-w-lk-settings divide-y divide-lk-line rounded-lk-md border border-lk-line">
              {formatRows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 px-3.5 py-3">
                  <dt className="text-lk-secondary text-lk-ink-3">{label}</dt>
                  <dd className="text-right text-lk-secondary font-semibold tabular text-lk-ink">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="formes" title={content.sections.shapes} level="h3">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-2">
                <div className="h-16 rounded-lk-sm border-[1.5px] border-lk-field bg-lk-surface" />
                <Caption>{content.shapes.radiusSm}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-16 rounded-lk-md border border-lk-line bg-lk-surface" />
                <Caption>{content.shapes.radiusMd}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-16 rounded-full bg-lk-stone-2" />
                <Caption>{content.shapes.radiusFull}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-16 rounded-lk-sm bg-lk-surface shadow-float" />
                <Caption>{content.shapes.shadowFloat}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-16 rounded-t-lk-md bg-lk-surface shadow-sheet" />
                <Caption>{content.shapes.shadowSheet}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-16 rounded-lk-md border border-lk-line" />
                <Caption>{content.shapes.borderLine}</Caption>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-16 rounded-lk-sm border-[1.5px] border-lk-field" />
                <Caption>{content.shapes.borderField}</Caption>
              </div>
            </div>
          </Section>

          <Section id="espacements" title={content.sections.spacing} level="h3">
            <Caption>{content.spacing.scaleCaption}</Caption>
            <div className="flex flex-col gap-1.5">
              {content.spacing.scale.map((size) => (
                <div key={size} className="flex items-center gap-3">
                  <span className="w-8 text-right text-lk-caption tabular text-lk-ink-3">
                    {size}
                  </span>
                  <span
                    className="block h-3 rounded-lk-sm bg-lk-blue-line"
                    style={{ width: `calc(var(--spacing) * ${size / 4})` }}
                  />
                </div>
              ))}
            </div>
            <dl className="grid max-w-lk-settings gap-x-6 gap-y-1.5 sm:grid-cols-[auto_1fr]">
              {[...content.spacing.breakpoints, ...content.spacing.containers].map((item) => (
                <div key={item.name} className="contents">
                  <dt className="text-lk-secondary font-semibold text-lk-ink">{item.name}</dt>
                  <dd className="text-lk-secondary text-lk-ink-3">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="mouvement" title={content.sections.motion} level="h3">
            <dl className="grid max-w-lk-settings gap-x-6 gap-y-1.5 sm:grid-cols-[auto_1fr]">
              {content.motion.map((item) => (
                <div key={item.name} className="contents">
                  <dt className="text-lk-secondary font-semibold text-lk-ink">{item.name}</dt>
                  <dd className="text-lk-secondary text-lk-ink-3">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </section>
      </main>
    </FacadeRoot>
  );
}
