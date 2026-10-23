// Classes shared by the sections of the public pages (L1-41 to L1-43), in the
// direction of the V1 since L1-49 and L1-50 (docs/DESIGN.md 1): the white
// card of the V1 (16 px, the cool line, a blue shadow) and its glass version
// on navy, their title and text, the large statement, the tile of an icon.

export const card =
  "rounded-lk-xl border border-lk-mist-line bg-lk-surface p-6 shadow-lk-card lg:px-7 lg:py-7";
export const cardTitle = "text-lk-h3 font-semibold text-lk-ink lg:text-lk-h3-lg";
export const cardText = "text-lk-body text-pretty text-lk-ink-2";
export const statement = "text-lk-h2 font-bold text-wide text-balance text-lk-ink lg:text-lk-h2-lg";

/** On navy: white at 4.5 %, a white line at 10 % (the « section-dark » cards of the V1). */
export const cardDark = "rounded-lk-xl border border-white/10 bg-white/[0.045] p-6 lg:px-7 lg:py-7";
export const cardTitleDark = "text-lk-h3 font-semibold text-white lg:text-lk-h3-lg";
export const cardTextDark = "text-lk-body text-pretty text-white/72";

/** The tile of an icon in a card of the V1 (« feat-icon »): 44 px, the blue tint. */
export const iconTile =
  "flex size-11 shrink-0 items-center justify-center rounded-lk-lg bg-lk-blue-tint text-lk-blue";
