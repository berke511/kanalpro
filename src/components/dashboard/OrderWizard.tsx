"use client";

// Hinweis: Diese Komponente hieß früher ein mehrstufiger Assistent
// ("Wizard") mit Weiter/Zurück-Navigation. Auf ausdrücklichen Wunsch wurde
// sie zu einem einseitigen, scrollbaren Formular umgebaut – alle Abschnitte
// sind gleichzeitig sichtbar, eine Sprungnavigation springt per Anker
// dorthin. Der Dateiname/Exportname blieb unverändert, um die eine
// Importstelle (auftraege/neu/page.tsx) nicht anfassen zu müssen.

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  FileText,
  HardHat,
  Info,
  LayoutTemplate,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  Users,
  Wrench,
} from "lucide-react";
import {
  ORDER_KINDS,
  ORDER_KIND_LABELS,
  ORDER_PRIORITIES,
  ORDER_PRIORITY_LABELS,
} from "@/lib/orders";
import { CUSTOMER_KINDS, CUSTOMER_KIND_LABELS } from "@/lib/customers";
import { formatDate, formatTime } from "@/lib/date";
import { ORDER_TEMPLATES } from "@/lib/orderTemplates";
import {
  checkDuplicateOpenOrders,
  checkResourceConflicts,
  createOrderFull,
  quickCreateCustomer,
  quickCreateProperty,
} from "@/app/(dashboard)/auftraege/actions";

type Option = { id: string; label: string };
type PropertyOption = { id: string; label: string; customerId: string };

const SECTIONS = [
  { key: "kunde", label: "Kunde & Objekt", icon: Users },
  { key: "art", label: "Auftragsart & Leistung", icon: Wrench },
  { key: "termin", label: "Termin", icon: Calendar },
  { key: "ressourcen", label: "Ressourcen", icon: HardHat },
  { key: "hinweise", label: "Hinweise", icon: FileText },
  { key: "dokumente", label: "Dokumente", icon: Paperclip },
] as const;

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm";
const labelClass = "text-sm font-medium text-foreground";
const requiredTag = <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-muted">Pflichtfeld</span>;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function SectionCard({
  id,
  index,
  title,
  subtitle,
  children,
  headerExtra,
}: {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="scroll-mt-20 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_rgba(16,24,40,.06)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-brand-soft text-[11px] font-bold text-brand-dark">
            {index}
          </span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-2">{subtitle}</p>
          </div>
        </div>
        {headerExtra}
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

export function OrderWizard({
  customers,
  properties,
  employees,
  vehicles,
  machines,
  initialCustomerId,
}: {
  customers: Option[];
  properties: PropertyOption[];
  employees: Option[];
  vehicles: Option[];
  machines: Option[];
  initialCustomerId?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewProperty, setShowNewProperty] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerKind, setNewCustomerKind] = useState<string>("privat");
  const [newPropertyFields, setNewPropertyFields] = useState({ name: "", street: "", postal_code: "", city: "" });
  const [duplicateWarning, setDuplicateWarning] = useState<Array<{ id: string; order_number: string | null; title: string; status: string }>>([]);
  const [conflicts, setConflicts] = useState<{ employees: Array<{ id: string; name: string; orderLabel: string }>; vehicles: Array<{ id: string; name: string; orderLabel: string }> }>({ employees: [], vehicles: [] });
  const [conflictsAcknowledged, setConflictsAcknowledged] = useState(false);
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [localProperties, setLocalProperties] = useState(properties);

  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [propertyId, setPropertyId] = useState("");
  const [orderKind, setOrderKind] = useState<string>("sonstige");
  const [serviceType, setServiceType] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [plannedDuration, setPlannedDuration] = useState("");
  const [timeWindowStart, setTimeWindowStart] = useState("");
  const [timeWindowEnd, setTimeWindowEnd] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [priority, setPriority] = useState<string>("standard");
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [machineIds, setMachineIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [arrivalInfo, setArrivalInfo] = useState("");
  const [accessInfo, setAccessInfo] = useState("");
  const [onsiteContact, setOnsiteContact] = useState("");
  const [safetyNotes, setSafetyNotes] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);

  const selectedCustomer = localCustomers.find((c) => c.id === customerId) ?? null;
  const selectedProperty = localProperties.find((p) => p.id === propertyId) ?? null;
  const visibleProperties = localProperties.filter((p) => p.customerId === customerId);

  const suggestedTitle = useMemo(() => {
    const parts = [selectedCustomer?.label, selectedProperty?.label, ORDER_KIND_LABELS[orderKind] ?? orderKind].filter(
      Boolean,
    );
    return parts.join(" – ") || "Neuer Auftrag";
  }, [selectedCustomer, selectedProperty, orderKind]);

  const effectiveTitle = titleTouched ? title : suggestedTitle;

  // Duplikat-Warnung: läuft automatisch (entprellt) an, sobald Kunde oder
  // Objekt ausgewählt werden – vorher an das Verlassen von Schritt 1
  // gekoppelt, jetzt gibt es keine Schritte mehr.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!customerId) {
        setDuplicateWarning([]);
        return;
      }
      startTransition(async () => {
        const dupes = await checkDuplicateOpenOrders(customerId, propertyId);
        setDuplicateWarning(dupes);
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [customerId, propertyId]);

  // Ressourcenkonflikte: läuft automatisch (entprellt) an, sobald Termin und
  // mindestens eine Ressource gesetzt sind – vorher an das Verlassen von
  // Schritt 4 gekoppelt.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const hasResources = employeeIds.length > 0 || vehicleIds.length > 0 || machineIds.length > 0;
      if (!scheduledDate || !hasResources) {
        setConflicts({ employees: [], vehicles: [] });
        return;
      }
      startTransition(async () => {
        const result = await checkResourceConflicts(employeeIds, [...vehicleIds, ...machineIds], scheduledDate);
        setConflicts(result);
        setConflictsAcknowledged(false);
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [scheduledDate, employeeIds, vehicleIds, machineIds]);

  function applyTemplate(templateKey: string) {
    const tpl = ORDER_TEMPLATES.find((t) => t.key === templateKey);
    if (!tpl) return;
    setOrderKind(tpl.order_kind);
    setDescription(tpl.description);
    setPlannedDuration(String(tpl.planned_duration_minutes));
    setInternalNotes((prev) => {
      const checklist = `Checkliste (${tpl.label}):\n${tpl.checklist.map((c) => `- ${c}`).join("\n")}`;
      return prev ? `${prev}\n\n${checklist}` : checklist;
    });
    setTemplatesOpen(false);
  }

  function handleCreateCustomer() {
    if (!newCustomerName.trim()) return;
    startTransition(async () => {
      const created = await quickCreateCustomer(newCustomerName, newCustomerKind);
      if (created) {
        setLocalCustomers((prev) => [...prev, { id: created.id, label: created.name }]);
        setCustomerId(created.id);
        setNewCustomerName("");
        setShowNewCustomer(false);
      }
    });
  }

  function handleCreateProperty() {
    if (!newPropertyFields.name.trim() || !customerId) return;
    startTransition(async () => {
      const created = await quickCreateProperty(
        customerId,
        newPropertyFields.name,
        newPropertyFields.street,
        newPropertyFields.postal_code,
        newPropertyFields.city,
      );
      if (created) {
        setLocalProperties((prev) => [...prev, { id: created.id, label: created.name, customerId }]);
        setPropertyId(created.id);
        setNewPropertyFields({ name: "", street: "", postal_code: "", city: "" });
        setShowNewProperty(false);
      }
    });
  }

  function toggleId(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    setDocuments((prev) => [...prev, ...Array.from(files)]);
  }

  function handleSubmit() {
    const fd = new FormData();
    fd.set("title", effectiveTitle);
    fd.set("customer_id", customerId);
    fd.set("property_id", propertyId);
    fd.set("order_kind", orderKind);
    fd.set("service_type", serviceType);
    fd.set("priority", priority);
    fd.set("scheduled_date", scheduledDate);
    fd.set("start_time", startTime);
    fd.set("planned_duration_minutes", plannedDuration);
    fd.set("time_window_start", timeWindowStart);
    fd.set("time_window_end", timeWindowEnd);
    if (allDay) fd.set("all_day", "1");
    if (isRecurring) fd.set("is_recurring", "1");
    fd.set("description", description);
    fd.set("internal_notes", internalNotes);
    fd.set("arrival_info", arrivalInfo);
    fd.set("access_info", accessInfo);
    fd.set("onsite_contact", onsiteContact);
    fd.set("safety_notes", safetyNotes);
    employeeIds.forEach((id) => fd.append("employee_ids", id));
    vehicleIds.forEach((id) => fd.append("vehicle_ids", id));
    machineIds.forEach((id) => fd.append("machine_ids", id));
    documents.forEach((file) => fd.append("documents", file));

    setSubmitting(true);
    startTransition(async () => {
      await createOrderFull(fd);
      router.refresh();
    });
  }

  const hasUnacknowledgedConflicts =
    (conflicts.employees.length > 0 || conflicts.vehicles.length > 0) && !conflictsAcknowledged;
  const canSubmit = !submitting && !hasUnacknowledgedConflicts && Boolean(customerId);

  const filledCount = [
    Boolean(customerId),
    Boolean(orderKind && orderKind !== "sonstige"),
    Boolean(scheduledDate),
    employeeIds.length > 0 || vehicleIds.length > 0 || machineIds.length > 0,
    Boolean(description || internalNotes),
    documents.length > 0,
  ].filter(Boolean).length;

  const submitButton = (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={!canSubmit}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
      Auftrag erstellen
    </button>
  );

  return (
    <div>
      {/* Sprungnavigation zu den Abschnitten – kein Weiter/Zurück, alle
          Abschnitte sind gleichzeitig ausfüllbar. */}
      <nav className="sticky top-4 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <a
              key={s.key}
              href={`#${s.key}`}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 py-1.5 text-xs font-medium text-muted hover:bg-background hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </a>
          );
        })}
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          {/* 1. Kunde & Objekt */}
          <SectionCard id="kunde" index={1} title="Kunde & Objekt" subtitle="Für wen wird der Auftrag ausgeführt?">
            <div>
              <label className={labelClass}>
                Kunde {requiredTag}
              </label>
              <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setPropertyId(""); }} className={fieldClass}>
                <option value="">Kunde auswählen…</option>
                {localCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCustomer((v) => !v)}
                className="mt-2 text-xs font-medium text-brand hover:underline"
              >
                + Neuen Kunden anlegen
              </button>
              {showNewCustomer && (
                <div className="mt-2 grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_160px_auto]">
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Name / Firma"
                    className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand"
                  />
                  <select
                    value={newCustomerKind}
                    onChange={(e) => setNewCustomerKind(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand"
                  >
                    {CUSTOMER_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {CUSTOMER_KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCreateCustomer}
                    className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    Anlegen
                  </button>
                </div>
              )}

              {selectedCustomer && (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-brand-soft p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-700 text-xs font-semibold text-white shadow-sm">
                    {initials(selectedCustomer.label)}
                  </span>
                  <p className="min-w-0 truncate text-sm font-semibold text-brand-dark">{selectedCustomer.label}</p>
                </div>
              )}
            </div>

            {duplicateWarning.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Ähnliche offene Aufträge für diesen Kunden gefunden:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {duplicateWarning.map((d) => (
                      <li key={d.id}>{d.order_number ?? d.title}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Objekt</label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                disabled={!customerId}
                className={fieldClass}
              >
                <option value="">Kein Objekt / Hauptadresse des Kunden</option>
                {visibleProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              {customerId && (
                <button
                  type="button"
                  onClick={() => setShowNewProperty((v) => !v)}
                  className="mt-2 text-xs font-medium text-brand hover:underline"
                >
                  + Neues Objekt anlegen
                </button>
              )}
              {showNewProperty && (
                <div className="mt-2 grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={newPropertyFields.name}
                    onChange={(e) => setNewPropertyFields((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Bezeichnung *"
                    className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand sm:col-span-2"
                  />
                  <input
                    type="text"
                    value={newPropertyFields.street}
                    onChange={(e) => setNewPropertyFields((f) => ({ ...f, street: e.target.value }))}
                    placeholder="Straße und Hausnummer"
                    className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand sm:col-span-2"
                  />
                  <input
                    type="text"
                    value={newPropertyFields.postal_code}
                    onChange={(e) => setNewPropertyFields((f) => ({ ...f, postal_code: e.target.value }))}
                    placeholder="PLZ"
                    className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand"
                  />
                  <input
                    type="text"
                    value={newPropertyFields.city}
                    onChange={(e) => setNewPropertyFields((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Ort"
                    className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={handleCreateProperty}
                    className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark sm:col-span-2"
                  >
                    Objekt anlegen
                  </button>
                </div>
              )}
            </div>
          </SectionCard>

          {/* 2. Auftragsart & Leistung */}
          <SectionCard
            id="art"
            index={2}
            title="Auftragsart & Leistung"
            subtitle="Was soll gemacht werden?"
            headerExtra={
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTemplatesOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted hover:bg-background hover:text-foreground"
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  Vorlage verwenden
                </button>
                {templatesOpen && (
                  <>
                    <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Schließen" onClick={() => setTemplatesOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                      {ORDER_TEMPLATES.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => applyTemplate(t.key)}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                        >
                          <Wrench className="h-3.5 w-3.5 shrink-0 text-muted" />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            }
          >
            <div>
              <label className={labelClass}>Auftragsart {requiredTag}</label>
              <select value={orderKind} onChange={(e) => setOrderKind(e.target.value)} className={fieldClass}>
                {ORDER_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ORDER_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Leistung / Aufgabe</label>
              <input
                type="text"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                placeholder="z. B. Verstopfung im Küchenabfluss"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Auftragstitel</label>
              <input
                type="text"
                value={effectiveTitle}
                onChange={(e) => {
                  setTitleTouched(true);
                  setTitle(e.target.value);
                }}
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-muted">Automatisch vorgeschlagen aus Kunde, Objekt und Auftragsart – frei editierbar.</p>
            </div>
          </SectionCard>

          {/* 3. Termin */}
          <SectionCard id="termin" index={3} title="Termin" subtitle="Wann soll der Einsatz stattfinden?">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Datum</label>
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Startzeit</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={allDay}
                  className={fieldClass}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
              Ganztägig
            </label>
            <div>
              <label className={labelClass}>Geplante Dauer (Minuten)</label>
              <input
                type="number"
                min="0"
                value={plannedDuration}
                onChange={(e) => setPlannedDuration(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <p className={labelClass}>Optionales Zeitfenster</p>
              <div className="mt-1 flex items-center gap-2">
                <input type="time" value={timeWindowStart} onChange={(e) => setTimeWindowStart(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm" />
                <span className="shrink-0 text-xs text-muted">bis</span>
                <input type="time" value={timeWindowEnd} onChange={(e) => setTimeWindowEnd(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
              Wiederkehrender Auftrag
            </label>
            <div>
              <label className={labelClass}>Dringlichkeit</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={fieldClass}>
                {ORDER_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {ORDER_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </SectionCard>

          {/* 4. Ressourcen */}
          <SectionCard id="ressourcen" index={4} title="Ressourcen" subtitle="Wer führt den Auftrag mit welchem Fahrzeug/Gerät aus?">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Users className="h-4 w-4" /> Mitarbeiter
              </h3>
              <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2.5">
                {employees.length === 0 && <p className="text-sm text-muted">Keine Mitarbeiter verfügbar.</p>}
                {employees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={employeeIds.includes(e.id)}
                      onChange={() => toggleId(employeeIds, setEmployeeIds, e.id)}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    {e.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Wrench className="h-4 w-4" /> Fahrzeuge
              </h3>
              <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2.5">
                {vehicles.length === 0 && <p className="text-sm text-muted">Keine verfügbaren Fahrzeuge.</p>}
                {vehicles.map((v) => (
                  <label key={v.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={vehicleIds.includes(v.id)}
                      onChange={() => toggleId(vehicleIds, setVehicleIds, v.id)}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    {v.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Paperclip className="h-4 w-4" /> Maschinen
              </h3>
              <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2.5">
                {machines.length === 0 && <p className="text-sm text-muted">Keine verfügbaren Maschinen.</p>}
                {machines.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={machineIds.includes(m.id)}
                      onChange={() => toggleId(machineIds, setMachineIds, m.id)}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            {(conflicts.employees.length > 0 || conflicts.vehicles.length > 0) && (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Terminkonflikte gefunden:</p>
                    <ul className="mt-1 list-inside list-disc">
                      {conflicts.employees.map((c) => (
                        <li key={`e-${c.id}`}>{c.name} ist am gewählten Tag bereits für {c.orderLabel} eingeplant.</li>
                      ))}
                      {conflicts.vehicles.map((c) => (
                        <li key={`v-${c.id}`}>{c.name} ist am gewählten Tag bereits für {c.orderLabel} eingeplant.</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={conflictsAcknowledged}
                    onChange={(e) => setConflictsAcknowledged(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                  />
                  Trotz Konflikt speichern
                </label>
              </div>
            )}
          </SectionCard>

          {/* 5. Hinweise */}
          <SectionCard id="hinweise" index={5} title="Hinweise" subtitle="Interne Notizen und Infos für den Außendienst.">
            <div>
              <label className={labelClass}>Beschreibung</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Interne Notizen</label>
              <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Anfahrtshinweise</label>
              <textarea value={arrivalInfo} onChange={(e) => setArrivalInfo(e.target.value)} rows={2} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Zugangsinformationen</label>
              <textarea value={accessInfo} onChange={(e) => setAccessInfo(e.target.value)} rows={2} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Ansprechpartner vor Ort</label>
              <input type="text" value={onsiteContact} onChange={(e) => setOnsiteContact(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Sicherheits-/Gefahrenhinweise</label>
              <textarea value={safetyNotes} onChange={(e) => setSafetyNotes(e.target.value)} rows={2} className={fieldClass} />
            </div>
          </SectionCard>

          {/* 6. Dokumente */}
          <SectionCard id="dokumente" index={6} title="Dokumente" subtitle="Pläne, Fotos oder sonstige Unterlagen vorab hochladen.">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              className="rounded-2xl border-2 border-dashed border-border p-8 text-center"
            >
              <Upload className="mx-auto h-6 w-6 text-muted" />
              <p className="mt-2 text-sm text-muted">Dateien hierher ziehen oder auswählen</p>
              <label className="mt-3 inline-block cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                Dateien auswählen
                <input type="file" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
              </label>
            </div>
            {documents.length > 0 && (
              <ul className="space-y-2">
                {documents.map((file, i) => (
                  <li key={`${file.name}-${i}`} className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-2.5 text-sm">
                    <span className="truncate">
                      {file.name} <span className="text-xs text-muted">({formatBytes(file.size)})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDocuments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Auf Mobile ist die Seitenleiste ausgeblendet – hier daher noch
              einmal derselbe Anlegen-Button am Ende des Formulars. */}
          <div className="lg:hidden">{submitButton}</div>
        </div>

        {/* Live-Zusammenfassung – nur auf größeren Bildschirmen dauerhaft sichtbar */}
        <div className="hidden lg:block">
          <div className="sticky top-20 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_rgba(16,24,40,.06)]">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <ClipboardList className="h-4 w-4" /> Live-Zusammenfassung
            </h3>
            <MiniRow icon={Users} label="Kunde" value={selectedCustomer?.label ?? "—"} />
            <MiniRow icon={Info} label="Objekt" value={selectedProperty?.label ?? "—"} />
            <MiniRow icon={Wrench} label="Auftragsart" value={ORDER_KIND_LABELS[orderKind] ?? orderKind} />
            <MiniRow icon={FileText} label="Titel" value={effectiveTitle} />
            <MiniRow icon={Calendar} label="Termin" value={scheduledDate ? `${formatDate(scheduledDate)}${startTime && !allDay ? `, ${formatTime(startTime)} Uhr` : ""}` : "—"} />
            <MiniRow icon={Users} label="Mitarbeiter" value={employeeIds.length > 0 ? String(employeeIds.length) : "—"} />
            <MiniRow icon={Wrench} label="Fahrzeuge/Maschinen" value={vehicleIds.length + machineIds.length > 0 ? String(vehicleIds.length + machineIds.length) : "—"} />
            <MiniRow icon={ClipboardList} label="Status" value="Entwurf → wird beim Anlegen auf „Offen“ gesetzt" />
            <MiniRow icon={Upload} label="Dokumente" value={documents.length > 0 ? String(documents.length) : "—"} />

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-2">
                <span>Vollständigkeit</span>
                <span>{filledCount} von {SECTIONS.length} Abschnitten</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#3a63ff] to-[#5b3ec9]"
                  style={{ width: `${Math.round((filledCount / SECTIONS.length) * 100)}%` }}
                />
              </div>
            </div>

            {hasUnacknowledgedConflicts && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Es bestehen noch nicht bestätigte Ressourcenkonflikte – bitte im Abschnitt „Ressourcen“ bestätigen.
              </p>
            )}

            <div className="border-t border-border pt-4">{submitButton}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniRow({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="text-muted">{label}</p>
        <p className="truncate font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
