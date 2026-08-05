"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Clock,
  FileText,
  Info,
  Mail,
  MapPin,
  Phone,
  Trash2,
  Truck,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatDate } from "@/lib/date";
import { INVITABLE_ROLES, ROLE_LABELS } from "@/lib/roles";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_BADGE_CLASS,
  EMPLOYEE_STATUS_LABELS,
  QUALIFICATION_TYPES,
  QUALIFICATION_TYPE_LABELS,
  WORK_TIME_MODELS,
  WORK_TIME_MODEL_LABELS,
  initialsFor,
  isExpired,
  isExpiringSoon,
} from "@/lib/employees";

export type PanelTabKey = "uebersicht" | "profil" | "qualifikationen" | "fahrzeug" | "dokumente" | "arbeitszeit";

const TABS: Array<{ key: PanelTabKey; label: string; icon: LucideIcon }> = [
  { key: "uebersicht", label: "Übersicht", icon: Info },
  { key: "profil", label: "Profil", icon: User },
  { key: "qualifikationen", label: "Qualifikationen", icon: Award },
  { key: "fahrzeug", label: "Fahrzeug", icon: Truck },
  { key: "dokumente", label: "Dokumente", icon: FileText },
  { key: "arbeitszeit", label: "Arbeitszeit", icon: Clock },
];

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return null;
  if (isExpired(date)) {
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">Abgelaufen</span>;
  }
  if (isExpiringSoon(date)) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        Läuft bald ab · {formatDate(date)}
      </span>
    );
  }
  return <span className="text-[11px] text-muted">gültig bis {formatDate(date)}</span>;
}

export type EmployeeDetailPanelData = {
  id: string;
  fullName: string | null;
  role: string;
  status: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  birthDate: string | null;
  hireDate: string | null;
  personnelNumber: string | null;
  department: string | null;
  location: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  photoUrl: string | null;
  weeklyHours: number | null;
  workTimeModel: string;
  vacationDaysTotal: number;
  vacationDaysUsed: number;
  sickDaysCurrentYear: number;
  overtimeHours: number;
  isArchived: boolean;
  isSelf: boolean;
  mainVehicle: { id: string; name: string } | null;
  vehicleHistory: Array<{ id: string; vehicleName: string; assignedAt: string; unassignedAt: string | null }>;
  qualifications: Array<{
    id: string;
    qualification_type: string;
    label: string | null;
    issued_date: string | null;
    expires_at: string | null;
    notes: string | null;
    removeAction: (formData: FormData) => void;
  }>;
  documents: Array<{
    id: string;
    category: string;
    file_name: string;
    size_bytes: number | null;
    expires_at: string | null;
    created_at: string;
    url: string | null;
    deleteAction: (formData: FormData) => void;
  }>;
  todayAssignment: {
    title: string;
    customerName: string | null;
    address: string | null;
    startTime: string | null;
    dispatcherName: string | null;
    priority: string;
    orderId: string;
  } | null;
  canManage: boolean;
  canChangeStatus: boolean;
  activeTab: PanelTabKey;
  vehicleOptions: Array<{ id: string; label: string }>;
  hrefs: { close: string; tabs: Record<PanelTabKey, string> };
  updateStatusAction: (formData: FormData) => void;
  updateProfileAction: (formData: FormData) => void;
  updateWorkTimeAction: (formData: FormData) => void;
  assignVehicleAction: (formData: FormData) => void;
  unassignVehicleAction: (formData: FormData) => void;
  uploadPhotoAction: (formData: FormData) => void;
  removePhotoAction: (formData: FormData) => void;
  addQualificationAction: (formData: FormData) => void;
  uploadDocumentAction: (formData: FormData) => void;
  changeRoleAction: (formData: FormData) => void;
  archiveAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
};

export function EmployeeDetailPanel({ data }: { data: EmployeeDetailPanelData }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(data.hrefs.close);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, data.hrefs.close]);

  const restUrlaub = Math.max(0, data.vacationDaysTotal - data.vacationDaysUsed);
  const addressLine = [data.street, [data.postalCode, data.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10";
  const labelClass = "text-xs font-medium text-muted";

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] lg:hidden" onClick={() => router.push(data.hrefs.close)} />
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md animate-slide-in-right overflow-y-auto border-l border-border bg-card p-5 shadow-xl lg:sticky lg:top-0 lg:z-0 lg:h-[calc(100vh-2rem)] lg:max-w-none lg:animate-none lg:shadow-none">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Mitarbeiterdetails</h2>
          <Link href={data.hrefs.close} className="rounded-full p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground">
            <X className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0">
            {data.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.photoUrl} alt={data.fullName ?? ""} className="h-14 w-14 rounded-2xl object-cover shadow-sm" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-lg font-semibold text-white shadow-sm">
                {initialsFor(data.fullName)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {data.fullName || "—"}
              {data.isSelf && <span className="ml-1.5 text-xs font-normal text-muted">(Du)</span>}
            </h3>
            <p className="truncate text-sm text-muted">{ROLE_LABELS[data.role] ?? data.role}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${EMPLOYEE_STATUS_BADGE_CLASS[data.status] ?? "bg-gray-100 text-gray-600"}`}>
            {EMPLOYEE_STATUS_LABELS[data.status] ?? data.status}
          </span>
          {data.isArchived && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">Archiviert</span>}
          {data.canChangeStatus && (
            <form action={data.updateStatusAction} className="ml-auto">
              <select
                name="status"
                defaultValue={data.status}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium outline-none focus:border-brand"
              >
                {EMPLOYEE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {EMPLOYEE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </form>
          )}
        </div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.key}
                href={data.hrefs.tabs[t.key]}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  data.activeTab === t.key
                    ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-4">
          {data.activeTab === "uebersicht" && (
            <div className="space-y-4 text-sm">
              <div className="space-y-2.5 rounded-xl bg-background p-3">
                {data.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-muted" />
                    <a href={`tel:${data.phone}`} className="text-foreground hover:text-brand">
                      {data.phone}
                    </a>
                  </div>
                )}
                {data.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0 text-muted" />
                    <a href={`mailto:${data.email}`} className="truncate text-foreground hover:text-brand">
                      {data.email}
                    </a>
                  </div>
                )}
                {addressLine && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    <p className="text-foreground">{addressLine}</p>
                  </div>
                )}
                {data.department && (
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 shrink-0 text-muted" />
                    <p className="text-foreground">{data.department}</p>
                  </div>
                )}
                {!data.phone && !data.email && !addressLine && !data.department && (
                  <p className="text-muted">Noch keine Kontaktdaten hinterlegt.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Heutiger Einsatz</p>
                {data.todayAssignment ? (
                  <Link
                    href={`/auftraege/${data.todayAssignment.orderId}`}
                    className="mt-2 block rounded-xl border border-border bg-background p-3 transition-colors hover:border-brand/30 hover:bg-brand-soft/30"
                  >
                    <p className="font-medium text-foreground">{data.todayAssignment.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{data.todayAssignment.customerName ?? "Kein Kunde"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {data.todayAssignment.startTime && <span>{data.todayAssignment.startTime.slice(0, 5)} Uhr</span>}
                      {data.todayAssignment.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {data.todayAssignment.address}
                        </span>
                      )}
                      {data.todayAssignment.dispatcherName && <span>Disponent: {data.todayAssignment.dispatcherName}</span>}
                    </div>
                  </Link>
                ) : (
                  <p className="mt-2 rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                    Kein Einsatz für heute geplant.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{restUrlaub}</p>
                  <p className="text-[11px] text-muted">Resturlaub</p>
                </div>
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{data.sickDaysCurrentYear}</p>
                  <p className="text-[11px] text-muted">Krankheitstage</p>
                </div>
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{data.overtimeHours}h</p>
                  <p className="text-[11px] text-muted">Überstunden</p>
                </div>
              </div>

              {data.mainVehicle && (
                <div className="flex items-center gap-2.5 rounded-xl bg-background p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted">Hauptfahrzeug</p>
                    <p className="truncate font-medium text-foreground">{data.mainVehicle.name}</p>
                  </div>
                </div>
              )}

              {data.qualifications.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Qualifikationen</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.qualifications.map((q) => (
                      <span
                        key={q.id}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          isExpired(q.expires_at) ? "bg-red-50 text-red-700" : isExpiringSoon(q.expires_at) ? "bg-amber-50 text-amber-700" : "bg-brand-soft text-brand"
                        }`}
                      >
                        {QUALIFICATION_TYPE_LABELS[q.qualification_type] ?? q.qualification_type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.canManage && !data.isSelf && data.role !== "owner" && (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Aktionen</p>
                  <form action={data.archiveAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-brand/30 hover:bg-brand-soft"
                    >
                      {data.isArchived ? "Archivierung aufheben" : "Archivieren"}
                    </button>
                  </form>
                  <form
                    action={data.deleteAction}
                    onSubmit={(e) => {
                      if (!window.confirm("Diesen Mitarbeiter unwiderruflich löschen? Dies kann nicht rückgängig gemacht werden.")) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      Endgültig löschen
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {data.activeTab === "profil" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-background p-3">
                <div className="h-12 w-12 shrink-0">
                  {data.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.photoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-sm font-semibold text-brand">
                      {initialsFor(data.fullName)}
                    </span>
                  )}
                </div>
                {data.canManage && (
                  <div className="flex flex-1 items-center gap-2 text-xs">
                    <form action={data.uploadPhotoAction} className="flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 font-medium text-foreground hover:bg-card">
                        <Camera className="h-3.5 w-3.5" />
                        Foto
                        <input type="file" name="file" accept="image/*" className="hidden" onChange={(e) => e.currentTarget.form?.requestSubmit()} />
                      </label>
                    </form>
                    {data.photoUrl && (
                      <form action={data.removePhotoAction}>
                        <button type="submit" className="text-red-600 hover:text-red-700">
                          Entfernen
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {data.canManage && !data.isSelf && data.role !== "owner" && (
                <form action={data.changeRoleAction} className="space-y-2 rounded-xl bg-background p-3">
                  <label className={labelClass}>Rolle</label>
                  <select
                    name="role"
                    defaultValue={data.role}
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    className={inputClass}
                  >
                    {INVITABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </form>
              )}

              {data.canManage ? (
                <form action={data.updateProfileAction} className="space-y-3">
                  <div>
                    <label className={labelClass}>Vor- und Nachname</label>
                    <input name="full_name" defaultValue={data.fullName ?? ""} required className={`mt-1 ${inputClass}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Telefonnummer</label>
                      <input name="phone" defaultValue={data.phone ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Personalnummer</label>
                      <input name="personnel_number" defaultValue={data.personnelNumber ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Straße & Hausnummer</label>
                    <input name="street" defaultValue={data.street ?? ""} className={`mt-1 ${inputClass}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>PLZ</label>
                      <input name="postal_code" defaultValue={data.postalCode ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Ort</label>
                      <input name="city" defaultValue={data.city ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Geburtsdatum</label>
                      <input type="date" name="birth_date" defaultValue={data.birthDate ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Eintrittsdatum</label>
                      <input type="date" name="hire_date" defaultValue={data.hireDate ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Abteilung</label>
                      <input name="department" defaultValue={data.department ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Standort</label>
                      <input name="location" defaultValue={data.location ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Notfallkontakt Name</label>
                      <input name="emergency_contact_name" defaultValue={data.emergencyContactName ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Notfallkontakt Telefon</label>
                      <input name="emergency_contact_phone" defaultValue={data.emergencyContactPhone ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Notizen</label>
                    <textarea name="notes" defaultValue={data.notes ?? ""} rows={3} className={`mt-1 ${inputClass}`} />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-gradient-to-br from-brand to-brand-dark px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                  >
                    Speichern
                  </button>
                </form>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                  Nur Owner, Admin oder Geschäftsführer können Profildaten bearbeiten.
                </p>
              )}
            </div>
          )}

          {data.activeTab === "qualifikationen" && (
            <div className="space-y-3">
              {data.qualifications.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                  Noch keine Qualifikationen erfasst.
                </p>
              )}
              {data.qualifications.map((q) => (
                <div key={q.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {QUALIFICATION_TYPE_LABELS[q.qualification_type] ?? q.qualification_type}
                        {q.label ? ` · ${q.label}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {q.issued_date && <span className="text-[11px] text-muted">seit {formatDate(q.issued_date)}</span>}
                        <ExpiryBadge date={q.expires_at} />
                      </div>
                      {q.notes && <p className="mt-1 text-xs text-muted">{q.notes}</p>}
                    </div>
                    {data.canManage && (
                      <form action={q.removeAction}>
                        <button type="submit" className="rounded-md p-1 text-muted hover:bg-card hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}

              {data.canManage && (
                <form action={data.addQualificationAction} className="space-y-2 rounded-xl border border-dashed border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Qualifikation hinzufügen</p>
                  <select name="qualification_type" required defaultValue="" className={inputClass}>
                    <option value="" disabled>
                      Art wählen…
                    </option>
                    {QUALIFICATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {QUALIFICATION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <input name="label" placeholder="Zusatz (z. B. Klasse BE)" className={inputClass} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Ausgestellt</label>
                      <input type="date" name="issued_date" className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Läuft ab</label>
                      <input type="date" name="expires_at" className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Hinzufügen
                  </button>
                </form>
              )}
            </div>
          )}

          {data.activeTab === "fahrzeug" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Hauptfahrzeug</p>
                {data.mainVehicle ? (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-background p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                        <Truck className="h-4 w-4" />
                      </span>
                      <p className="font-medium text-foreground">{data.mainVehicle.name}</p>
                    </div>
                    {data.canManage && (
                      <form action={data.unassignVehicleAction}>
                        <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700">
                          Entfernen
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                    Kein Hauptfahrzeug zugewiesen.
                  </p>
                )}
              </div>

              {data.canManage && (
                <form action={data.assignVehicleAction} className="space-y-2 rounded-xl border border-dashed border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Fahrzeug wechseln</p>
                  <select name="fleet_item_id" defaultValue="" className={inputClass}>
                    <option value="">Kein Fahrzeug</option>
                    {data.vehicleOptions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Zuweisen
                  </button>
                </form>
              )}

              {data.vehicleHistory.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Fahrzeughistorie</p>
                  <div className="mt-2 space-y-1.5">
                    {data.vehicleHistory.map((h) => (
                      <div key={h.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                        <span className="text-foreground">{h.vehicleName}</span>
                        <span className="text-muted">
                          {formatDate(h.assignedAt)} – {h.unassignedAt ? formatDate(h.unassignedAt) : "heute"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {data.activeTab === "dokumente" && (
            <div className="space-y-3">
              {data.documents.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                  Noch keine Dokumente hochgeladen.
                </p>
              )}
              {data.documents.map((d) => (
                <div key={d.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-brand">{DOCUMENT_CATEGORY_LABELS[d.category] ?? d.category}</p>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noreferrer" className="truncate font-medium text-foreground hover:text-brand">
                          {d.file_name}
                        </a>
                      ) : (
                        <p className="truncate font-medium text-foreground">{d.file_name}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        <span>{formatBytes(d.size_bytes)}</span>
                        <ExpiryBadge date={d.expires_at} />
                      </div>
                    </div>
                    {data.canManage && (
                      <form action={d.deleteAction}>
                        <button type="submit" className="rounded-md p-1 text-muted hover:bg-card hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}

              {data.canManage && (
                <form action={data.uploadDocumentAction} className="space-y-2 rounded-xl border border-dashed border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dokument hochladen</p>
                  <select name="category" defaultValue="sonstiges" className={inputClass}>
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {DOCUMENT_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <div>
                    <label className={labelClass}>Ablaufdatum (optional)</label>
                    <input type="date" name="expires_at" className={`mt-1 ${inputClass}`} />
                  </div>
                  <input type="file" name="file" required className="w-full text-xs" />
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Hochladen
                  </button>
                </form>
              )}
            </div>
          )}

          {data.activeTab === "arbeitszeit" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{restUrlaub}</p>
                  <p className="text-[11px] text-muted">von {data.vacationDaysTotal} Tagen Resturlaub</p>
                </div>
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{data.sickDaysCurrentYear}</p>
                  <p className="text-[11px] text-muted">Krankheitstage (Jahr)</p>
                </div>
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-lg font-semibold text-foreground">{data.overtimeHours}h</p>
                  <p className="text-[11px] text-muted">Überstunden</p>
                </div>
              </div>

              {data.canManage ? (
                <form action={data.updateWorkTimeAction} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Wochenstunden</label>
                      <input type="number" step="0.5" min="0" name="weekly_hours" defaultValue={data.weeklyHours ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Arbeitszeitmodell</label>
                      <select name="work_time_model" defaultValue={data.workTimeModel} className={`mt-1 ${inputClass}`}>
                        {WORK_TIME_MODELS.map((m) => (
                          <option key={m} value={m}>
                            {WORK_TIME_MODEL_LABELS[m]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Urlaubsanspruch (Tage/Jahr)</label>
                      <input type="number" step="0.5" min="0" name="vacation_days_total" defaultValue={data.vacationDaysTotal} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Genommene Urlaubstage</label>
                      <input type="number" step="0.5" min="0" name="vacation_days_used" defaultValue={data.vacationDaysUsed} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Krankheitstage (Jahr)</label>
                      <input type="number" step="0.5" min="0" name="sick_days_current_year" defaultValue={data.sickDaysCurrentYear} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Überstunden</label>
                      <input type="number" step="0.5" name="overtime_hours" defaultValue={data.overtimeHours} className={`mt-1 ${inputClass}`} />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-gradient-to-br from-brand to-brand-dark px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                  >
                    Speichern
                  </button>
                </form>
              ) : (
                <div className="space-y-2 rounded-xl bg-background p-3 text-sm">
                  <p className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted" />
                    {data.weeklyHours ? `${data.weeklyHours} Std./Woche · ` : ""}
                    {WORK_TIME_MODEL_LABELS[data.workTimeModel] ?? data.workTimeModel}
                  </p>
                  {data.hireDate && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted" />
                      Eingetreten am {formatDate(data.hireDate)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
