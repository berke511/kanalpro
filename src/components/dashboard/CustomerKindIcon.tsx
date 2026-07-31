import { Home, Building2, Factory, Landmark, Sparkles, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  privat: Home,
  gewerbe: Building2,
  industrie: Factory,
  kommune: Landmark,
  sonstige: Sparkles,
};

export function CustomerKindIcon({ kind, className }: { kind: string; className?: string }) {
  const Icon = ICONS[kind] ?? Sparkles;
  return <Icon className={className} strokeWidth={1.75} />;
}
