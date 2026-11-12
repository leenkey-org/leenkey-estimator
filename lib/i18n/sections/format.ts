// Texts of the interface, part « format » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// lib/format.ts (docs/DESIGN.md section 3.3). \u00A0 keeps a number with its unit.

export const frFormat = {
  room: "pièce",
  rooms: "pièces",
  roomsShort: "p",
  at: "à",
  justNow: "à l'instant",
  minutesAgo: (minutes: number) => `il y a ${minutes}\u00A0min`,
  hoursAgo: (hours: number) => `il y a ${hours}\u00A0h`,
  yesterday: "hier",
  daysAgo: (days: number) => `il y a ${days}\u00A0j`,
  waitMinutes: (minutes: number) => `${minutes}\u00A0min`,
  waitHours: (hours: number) => `${hours}\u00A0h`,
  waitDays: (days: number) => `${days}\u00A0${days > 1 ? "jours" : "jour"}`,
} as const;
