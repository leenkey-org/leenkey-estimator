import {
  Bell,
  FileText,
  Flag,
  Folder,
  Heart,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  Search,
  Sparkles,
  SquarePlus,
  Tag,
  Undo2,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { NavIconName } from "./nav-items";

// Lucide icons of the navigation (docs/DESIGN.md 6): the star of the mockups
// is the assistant's Sparkles, the document is FileText. No house icon outside
// the logo (DESIGN 1): « Ma vente » is a dashboard, « Annonces » a list,
// « Vendre » the plus of « Vendre mon bien ».
const ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  listings: ClipboardList,
  file: FileText,
  message: MessageSquare,
  user: User,
  search: Search,
  heart: Heart,
  folder: Folder,
  users: Users,
  sparkles: Sparkles,
  "layout-grid": LayoutGrid,
  flag: Flag,
  "square-plus": SquarePlus,
  // The refunds of the back office (DECISIONS.md 2026-11-25).
  refund: Undo2,
  // The column of the signed-in areas (DECISIONS.md 2026-11-26): alerts, buying project, plan.
  bell: Bell,
  wallet: Wallet,
  tag: Tag,
};

/** Icon of a navigation item, decorative: the label names the link. */
export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" className={className} />;
}
