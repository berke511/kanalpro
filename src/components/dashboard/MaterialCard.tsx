import Link from "next/link";
import { AlertTriangle, MapPin, Package, Truck } from "lucide-react";
import {
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_STATUS_BADGE_CLASS,
  MATERIAL_STATUS_DOT_CLASS,
  MATERIAL_STATUS_LABELS,
  initialsFor,
} from "@/lib/materials";

export type MaterialCardData = {
  id: string;
  materialNumber: string | null;
  name: string;
  category: string | null;
  status: string;
  photoUrl: string | null;
  location: string | null;
  supplierName: string | null;
  quantity: number;
  minQuantity: number | null;
  reservedQuantity: number;
  availableQuantity: number;
  unit: string;
  isArchived: boolean;
};

export function MaterialCard({ item, href }: { item: MaterialCardData; href: string }) {
  const lowStock = item.minQuantity !== null && item.quantity > 0 && item.quantity <= item.minQuantity;
  const outOfStock = item.quantity <= 0;

  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md ${
        item.isArchived ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0">
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt={item.name} className="h-12 w-12 rounded-xl object-cover shadow-sm" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-semibold text-white shadow-sm">
              {initialsFor(item.name)}
            </span>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${MATERIAL_STATUS_DOT_CLASS[item.status] ?? "bg-gray-400"}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand">{item.name}</p>
          <p className="truncate text-xs text-muted">
            {item.materialNumber ?? "—"}
            {item.category ? ` · ${MATERIAL_CATEGORY_LABELS[item.category] ?? item.category}` : ""}
          </p>
        </div>
        {(lowStock || outOfStock) && (
          <span title={outOfStock ? "Nicht verfügbar" : "Niedriger Bestand"} className={outOfStock ? "text-red-500" : "text-amber-500"}>
            <AlertTriangle className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${MATERIAL_STATUS_BADGE_CLASS[item.status] ?? "bg-gray-100 text-gray-600"}`}>
          {MATERIAL_STATUS_LABELS[item.status] ?? item.status}
        </span>
        <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted">
          {item.quantity.toLocaleString("de-DE")} {item.unit}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted">
        {item.location && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> {item.location}
          </p>
        )}
        {item.supplierName && (
          <p className="flex items-center gap-1.5">
            <Truck className="h-3 w-3" /> {item.supplierName}
          </p>
        )}
        {item.reservedQuantity > 0 && (
          <p className="flex items-center gap-1.5">
            <Package className="h-3 w-3" /> {item.reservedQuantity.toLocaleString("de-DE")} reserviert · {item.availableQuantity.toLocaleString("de-DE")} verfügbar
          </p>
        )}
      </div>
    </Link>
  );
}
