import {
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Truck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export const NAV_ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard },
  { href: "/kunden", label: "Kunden", icon: Users },
  { href: "/auftraege", label: "Aufträge", icon: ClipboardList },
  { href: "/einsatzplanung", label: "Einsatzplanung", icon: CalendarDays },
  { href: "/mitarbeiter", label: "Mitarbeiter", icon: UserCog },
  { href: "/fahrzeuge", label: "Fahrzeuge", icon: Truck },
  { href: "/material", label: "Material", icon: Package },
  { href: "/berichte", label: "Einsatzberichte", icon: FileText },
  { href: "/rechnungen", label: "Angebote & Rechnungen", icon: Receipt },
  { href: "/nachrichten", label: "Nachrichten", icon: MessageSquare },
];
