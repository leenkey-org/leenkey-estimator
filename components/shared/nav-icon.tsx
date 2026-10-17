import {
  FileText,
  Flag,
  Folder,
  Heart,
  House,
  LayoutGrid,
  MessageSquare,
  Search,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { NavIconName } from "./nav-items";

// Lucide icons of the navigation (docs/DESIGN.md 6): the star of the mockups
// is the assistant's Sparkles, the document is FileText.
const ICONS: Record<NavIconName, LucideIcon> = {
  home: House,
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
};

/** Icon of a navigation item, decorative: the label names the link. */
export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" className={className} />;
}
