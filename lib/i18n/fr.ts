// User-facing texts (CLAUDE.md section 9): no string literal in components.
export const fr = {
  env: {
    stagingBanner: "Environnement de test",
    stagingBannerDetail:
      "Les données de cette version peuvent être modifiées ou supprimées à tout moment.",
  },
  // lib/format.ts (docs/DESIGN.md section 3.3).   keeps a number with its unit.
  format: {
    room: "pièce",
    rooms: "pièces",
    roomsShort: "p",
    at: "à",
    justNow: "à l'instant",
    minutesAgo: (minutes: number) => `il y a ${minutes} min`,
    hoursAgo: (hours: number) => `il y a ${hours} h`,
    yesterday: "hier",
    daysAgo: (days: number) => `il y a ${days} j`,
  },
  field: {
    optional: "(facultatif)",
  },
  // Labels of SPEC-V2 section 7 (StatusBadge mapping), colours in DESIGN.md 10.2.
  listingStatus: {
    draft: "Brouillon",
    pending: "En attente de validation",
    published: "En ligne",
    paused: "En pause",
    suspended: "Suspendue par Leenkey",
    sold: "Vendu",
    rejected: "À corriger",
  },
  plan: {
    autonomie: "Autonomie",
    accompagne: "Accompagné",
    serenite: "Sérénité",
  },
  propertyType: {
    appartement: "Appartement",
    maison: "Maison",
    terrain: "Terrain",
    autre: "Bien",
  },
  dpe: {
    label: "DPE",
  },
  propertyCard: {
    badgeNew: "Nouveau",
    badgePriceDrop: "Prix en baisse",
    photoCount: (total: number) => `1 / ${total}`,
  },
} as const;
