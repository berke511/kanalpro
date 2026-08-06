"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clipboard,
  Cog,
  MapPin,
  Plus,
  Truck,
  Upload,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  REPORT_PHOTO_CATEGORIES,
  REPORT_PHOTO_CATEGORY_LABELS,
  REPORT_TEMPLATES,
  WORK_TYPES,
  WORK_TYPE_LABELS,
  calculateWorkedMinutes,
  formatMinutesAsHours,
} from "@/lib/reports";
import { todayBerlinISO } from "@/lib/date";
import { SignaturePad } from "@/components/dashboard/SignaturePad";

const STEPS = ["Auftrag", "Einsatzdaten", "Arbeiten", "Material", "Maschinen", "Fotos", "Kunde", "Zusammenfassung"];

type OrderOption = {
  id: string;
  label: string;
  customerName: string | null;
  address: string | null;
  onsiteContact: string | null;
  assignedEmployeeIds: string[];
};

type MaterialLine = { material_id: string; quantity: number; name: string; unit: string };

export function ReportWizard({
  action,
  orderOptions,
  employeeOptions,
  machineOptions,
  materialOptions,
  canLinkCommercial,
}: {
  action: (formData: FormData) => void;
  orderOptions: OrderOption[];
  employeeOptions: Array<{ id: string; label: string }>;
  machineOptions: Array<{ id: string; label: string; kind: string }>;
  materialOptions: Array<{ id: string; label: string; unit: string }>;
  canLinkCommercial: boolean;
}) {
  const [step, setStep] = useState(0);
  // Schützt vor Doppel-Anlage bei Doppelklick/Netzwerk-Retry: ein pro
  // Formular-Öffnung einmalig erzeugter Token wird serverseitig gegen einen
  // Unique-Index geprüft (siehe createReportFull) – ein zweiter Submit mit
  // demselben Token landet beim bereits angelegten Bericht statt ein
  // Duplikat zu erzeugen. Der lokale isSubmitting-State verhindert zusätzlich
  // ein versehentliches zweites Absenden per Klick, während der erste
  // Request noch läuft.
  const [submitToken] = useState(() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [reportDate] = useState(() => todayBerlinISO());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("30");
  const [weather, setWeather] = useState("");
  const [workTypes, setWorkTypes] = useState<Set<string>>(new Set());
  const [workPerformed, setWorkPerformed] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set());
  const [materialLines, setMaterialLines] = useState<MaterialLine[]>([]);
  const [materialPick, setMaterialPick] = useState("");
  const [materialQty, setMaterialQty] = useState("1");
  const [photos, setPhotos] = useState<Record<string, File[]>>({ vorher: [], nachher: [], schaden: [], baustelle: [] });
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [signatureRole, setSignatureRole] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const [finalizeOrder, setFinalizeOrder] = useState(canLinkCommercial);
  const [consumeMaterial, setConsumeMaterial] = useState(true);
  const [prepareInvoice, setPrepareInvoice] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [archiveReportFlag, setArchiveReportFlag] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedOrder = orderOptions.find((o) => o.id === orderId) ?? null;

  function handleOrderChange(id: string) {
    setOrderId(id);
    const order = orderOptions.find((o) => o.id === id);
    setSelectedEmployees(new Set(order?.assignedEmployeeIds ?? []));
  }

  function toggleSet<T>(set: Set<T>, setSet: (s: Set<T>) => void, value: T) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSet(next);
  }

  function applyTemplate(templateKey: string) {
    const tpl = REPORT_TEMPLATES.find((t) => t.key === templateKey);
    if (!tpl) return;
    setWorkTypes(new Set(tpl.workTypes));
    setWorkPerformed(tpl.workPerformed);
  }

  function addMaterialLine() {
    const opt = materialOptions.find((m) => m.id === materialPick);
    const qty = Number(materialQty.replace(",", "."));
    if (!opt || !Number.isFinite(qty) || qty <= 0) return;
    setMaterialLines((prev) => [...prev, { material_id: opt.id, quantity: qty, name: opt.label, unit: opt.unit }]);
    setMaterialPick("");
    setMaterialQty("1");
  }
  function removeMaterialLine(index: number) {
    setMaterialLines((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePhotoFiles(category: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotos((prev) => ({ ...prev, [category]: [...prev[category]!, ...Array.from(files)] }));
  }
  function removePhoto(category: string, index: number) {
    setPhotos((prev) => ({ ...prev, [category]: prev[category]!.filter((_, i) => i !== index) }));
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsStatus("Standortbestimmung wird von diesem Gerät nicht unterstützt.");
      return;
    }
    setGpsStatus("Standort wird ermittelt…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("Standort erfasst.");
      },
      () => setGpsStatus("Standort konnte nicht ermittelt werden."),
    );
  }

  const workedMinutes = useMemo(() => calculateWorkedMinutes(startTime || null, endTime || null, Number(breakMinutes) || 0), [startTime, endTime, breakMinutes]);
  const materialsJson = useMemo(() => JSON.stringify(materialLines.map((m) => ({ material_id: m.material_id, quantity: m.quantity }))), [materialLines]);
  const photoCount = Object.values(photos).reduce((sum, arr) => sum + arr.length, 0);

  const canGoNext = step !== 0 || orderId.length > 0;

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10";
  const labelClass = "text-sm font-medium text-foreground";

  const summaryChecks = [
    { label: "Auftrag ausgewählt", done: orderId.length > 0 },
    { label: "Einsatzdaten erfasst", done: startTime.length > 0 && endTime.length > 0 },
    { label: "Arbeiten dokumentiert", done: workTypes.size > 0 || workPerformed.trim().length > 0 },
    { label: "Kundenunterschrift", done: signatureName.trim().length > 0 },
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Neuer Einsatzbericht</h1>
            <p className="mt-1 text-sm text-muted">Dokumentieren Sie den Einsatz Schritt für Schritt – Material, Fotos und Unterschrift inklusive.</p>
          </div>
          <Link href="/berichte" className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-background hover:text-foreground">
            Abbrechen
          </Link>
        </div>

        {/* Fortschrittsleiste */}
        <div className="mt-5 flex items-center overflow-x-auto pb-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex shrink-0 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    i < step
                      ? "bg-brand text-white"
                      : i === step
                        ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm shadow-brand/30"
                        : "border border-border bg-background text-muted"
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`whitespace-nowrap text-[11px] font-medium ${i === step ? "text-foreground" : "text-muted"}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <span className={`mx-2 h-px w-8 sm:w-10 ${i < step ? "bg-brand" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <form action={action} className="mt-6 space-y-6">
          <input type="hidden" name="report_date" value={reportDate} />
          <input type="hidden" name="client_submit_token" value={submitToken} />
          <input type="hidden" name="break_minutes" value={breakMinutes} />
          <input type="hidden" name="materials_json" value={materialsJson} />
          {gps && <input type="hidden" name="gps_lat" value={gps.lat} />}
          {gps && <input type="hidden" name="gps_lng" value={gps.lng} />}
          <input type="hidden" name="automation_finalize_order" value={finalizeOrder ? "1" : "0"} />
          <input type="hidden" name="automation_consume_material" value={consumeMaterial ? "1" : "0"} />
          <input type="hidden" name="automation_prepare_invoice" value={prepareInvoice ? "1" : "0"} />
          <input type="hidden" name="automation_archive_report" value={archiveReportFlag ? "1" : "0"} />

          {/* Schritt 1: Auftrag */}
          <div className={step === 0 ? "space-y-4" : "hidden"}>
            <div>
              <label className={labelClass}>Auftrag auswählen</label>
              <select name="order_id" required value={orderId} onChange={(e) => handleOrderChange(e.target.value)} className={`mt-1 ${inputClass}`}>
                <option value="">— Auftrag wählen —</option>
                {orderOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {selectedOrder && (
              <div className="space-y-2 rounded-xl bg-background p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Automatisch übernommen</p>
                <p className="text-foreground">Kunde: {selectedOrder.customerName ?? "—"}</p>
                <p className="text-foreground">Adresse: {selectedOrder.address ?? "—"}</p>
                <p className="text-foreground">Ansprechpartner: {selectedOrder.onsiteContact ?? "—"}</p>
              </div>
            )}
            <div>
              <label className={labelClass}>Mitarbeiter</label>
              <p className="mt-0.5 text-xs text-muted">Aus der Auftragszuweisung übernommen, bei Bedarf anpassen.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {employeeOptions.map((e) => {
                  const selected = selectedEmployees.has(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => toggleSet(selectedEmployees, setSelectedEmployees, e.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        selected ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted hover:bg-card"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {e.label}
                    </button>
                  );
                })}
              </div>
              {Array.from(selectedEmployees).map((id) => (
                <input key={id} type="hidden" name="employees" value={id} />
              ))}
            </div>
          </div>

          {/* Schritt 2: Einsatzdaten */}
          <div className={step === 1 ? "space-y-4" : "hidden"}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Beginn</label>
                <input type="time" name="start_time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>Ende</label>
                <input type="time" name="end_time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Pause (Minuten)</label>
              <input type="number" min="0" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-background p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Clipboard className="h-4 w-4" />
              </span>
              <div className="text-xs">
                <p className="font-medium text-foreground">Automatische Stundenberechnung</p>
                <p className="mt-0.5 text-muted">{formatMinutesAsHours(workedMinutes)}</p>
              </div>
            </div>
            <div>
              <label className={labelClass}>Wetter (optional)</label>
              <input name="weather" value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="z. B. Sonnig, 18 °C" className={`mt-1 ${inputClass}`} />
            </div>
            <div className="rounded-xl bg-background p-3">
              <button type="button" onClick={captureGps} className="flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark">
                <MapPin className="h-4 w-4" />
                GPS-Standort des Einsatzes erfassen
              </button>
              {gpsStatus && <p className="mt-1 text-xs text-muted">{gpsStatus}</p>}
            </div>
          </div>

          {/* Schritt 3: Durchgeführte Arbeiten */}
          <div className={step === 2 ? "space-y-4" : "hidden"}>
            <div>
              <label className={labelClass}>Vorlagen für häufige Einsatzarten</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {REPORT_TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => applyTemplate(t.key)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted hover:bg-card"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Durchgeführte Arbeiten</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {WORK_TYPES.map((w) => {
                  const selected = workTypes.has(w);
                  return (
                    <label
                      key={w}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        selected ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="work_types"
                        value={w}
                        checked={selected}
                        onChange={() => toggleSet(workTypes, setWorkTypes, w)}
                        className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                      />
                      {WORK_TYPE_LABELS[w]}
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={labelClass}>Freitext</label>
              <textarea name="work_performed" value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} rows={5} className={`mt-1 ${inputClass}`} placeholder="Detaillierte Beschreibung der durchgeführten Arbeiten…" />
            </div>
          </div>

          {/* Schritt 4: Material */}
          <div className={step === 3 ? "space-y-4" : "hidden"}>
            <label className={labelClass}>Material direkt auswählen</label>
            <div className="flex flex-wrap gap-2">
              <select value={materialPick} onChange={(e) => setMaterialPick(e.target.value)} className={`${inputClass} flex-1 min-w-[160px]`}>
                <option value="">Material wählen…</option>
                {materialOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input type="number" step="0.01" min="0.01" value={materialQty} onChange={(e) => setMaterialQty(e.target.value)} placeholder="Menge" className={`${inputClass} w-24`} />
              <button type="button" onClick={addMaterialLine} className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {materialLines.length === 0 && <p className="text-xs text-muted">z. B. KG-Rohr DN200 + 2 Stück</p>}
              {materialLines.map((line, i) => (
                <div key={`${line.material_id}-${i}`} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm">
                  <span className="text-foreground">
                    {line.name} · {line.quantity} {line.unit}
                  </span>
                  <button type="button" onClick={() => removeMaterialLine(i)} className="text-muted hover:text-red-600" aria-label="Entfernen">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">Der Bestand wird beim Speichern automatisch reduziert (siehe Automatisierungen in der Zusammenfassung).</p>
          </div>

          {/* Schritt 5: Maschinen */}
          <div className={step === 4 ? "space-y-4" : "hidden"}>
            <label className={labelClass}>Welche Maschinen/Fahrzeuge wurden genutzt?</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {machineOptions.map((m) => {
                const selected = selectedMachines.has(m.id);
                const Icon = m.kind === "fahrzeug" ? Truck : Cog;
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                      selected ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="machines"
                      value={m.id}
                      checked={selected}
                      onChange={() => toggleSet(selectedMachines, setSelectedMachines, m.id)}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    <Icon className="h-4 w-4 shrink-0" />
                    {m.label}
                  </label>
                );
              })}
              {machineOptions.length === 0 && <p className="text-xs text-muted">Keine Fahrzeuge/Maschinen angelegt.</p>}
            </div>
          </div>

          {/* Schritt 6: Fotos */}
          <div className={step === 5 ? "space-y-5" : "hidden"}>
            {REPORT_PHOTO_CATEGORIES.map((category) => (
              <div key={category}>
                <label className={labelClass}>{REPORT_PHOTO_CATEGORY_LABELS[category]}</label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCategory(category);
                  }}
                  onDragLeave={() => setDragOverCategory(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverCategory(null);
                    handlePhotoFiles(category, e.dataTransfer.files);
                  }}
                  className={`mt-1.5 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
                    dragOverCategory === category ? "border-brand bg-brand-soft/40" : "border-border bg-background"
                  }`}
                >
                  <Upload className="h-4 w-4 text-muted" />
                  <p className="text-xs text-muted">Dateien hier ablegen oder</p>
                  <label className="cursor-pointer text-xs font-medium text-brand hover:text-brand-dark">
                    Datei auswählen
                    <input
                      ref={(el) => {
                        fileInputRefs.current[category] = el;
                      }}
                      type="file"
                      name={`photo_${category}`}
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handlePhotoFiles(category, e.target.files)}
                    />
                  </label>
                </div>
                {photos[category]!.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {photos[category]!.map((f, i) => (
                      <span key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs text-foreground">
                        {f.name}
                        <button type="button" onClick={() => removePhoto(category, i)} aria-label="Entfernen" className="text-muted hover:text-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Schritt 7: Kunde / Unterschrift */}
          <div className={step === 6 ? "space-y-4" : "hidden"}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Name</label>
                <input name="customer_signature_name" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>Funktion</label>
                <input name="customer_signature_role" value={signatureRole} onChange={(e) => setSignatureRole(e.target.value)} placeholder="z. B. Hausmeister" className={`mt-1 ${inputClass}`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Datum</label>
              <p className="mt-1 text-sm text-muted">{reportDate}</p>
            </div>
            <div>
              <label className={labelClass}>Digitale Unterschrift</label>
              <div className="mt-1.5">
                <SignaturePad name="signature_data_url" />
              </div>
              <p className="mt-1 text-xs text-muted">
                Unterschrift ist optional – der Bericht kann auch ohne Unterschrift gespeichert und später ergänzt werden. Als „unterschrieben“ gilt er erst, wenn Name UND
                Zeichnung vorliegen.
              </p>
            </div>
          </div>

          {/* Schritt 8: Zusammenfassung */}
          {step === 7 && (
            <div className="space-y-5">
              <div className="space-y-3 rounded-xl bg-background p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Zusammenfassung</p>
                <div className="space-y-1.5">
                  {summaryChecks.map((c) => (
                    <div key={c.label} className="flex items-center gap-2">
                      {c.done ? <Check className="h-4 w-4 text-brand" /> : <Circle className="h-4 w-4 text-muted" />}
                      <span className={c.done ? "text-foreground" : "text-muted"}>{c.label}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3">
                  <p className="text-muted">Auftrag</p>
                  <p className="font-medium text-foreground">{selectedOrder?.label ?? "—"}</p>
                  <p className="text-muted">Kunde</p>
                  <p className="font-medium text-foreground">{selectedOrder?.customerName ?? "—"}</p>
                  <p className="text-muted">Arbeitszeit</p>
                  <p className="font-medium text-foreground">{formatMinutesAsHours(workedMinutes)}</p>
                  <p className="text-muted">Material</p>
                  <p className="font-medium text-foreground">{materialLines.length} Position(en)</p>
                  <p className="text-muted">Fotos</p>
                  <p className="font-medium text-foreground">{photoCount}</p>
                  <p className="text-muted">Unterschrift</p>
                  <p className="font-medium text-foreground">{signatureName || "Ausstehend"}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Automatisierungen nach dem Speichern</p>
                <div className="flex items-center gap-2.5 rounded-lg bg-background p-2.5 text-xs text-muted">
                  <Check className="h-3.5 w-3.5 shrink-0 text-brand" /> PDF wird automatisch erzeugt
                </div>
                <div className="flex items-center gap-2.5 rounded-lg bg-background p-2.5 text-xs text-muted">
                  <Check className="h-3.5 w-3.5 shrink-0 text-brand" /> Arbeitszeiten werden automatisch übernommen
                </div>
                <label className={`flex items-center gap-2.5 rounded-lg bg-background p-2.5 text-sm ${!canLinkCommercial ? "opacity-50" : ""}`}>
                  <input
                    type="checkbox"
                    checked={finalizeOrder}
                    disabled={!canLinkCommercial}
                    onChange={(e) => setFinalizeOrder(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                  />
                  Auftrag auf „Abgeschlossen“ setzen (nur wenn unterschrieben){!canLinkCommercial ? " – nur für Büro/Disponent/Admin" : ""}
                </label>
                <label className="flex items-center gap-2.5 rounded-lg bg-background p-2.5 text-sm">
                  <input type="checkbox" checked={consumeMaterial} onChange={(e) => setConsumeMaterial(e.target.checked)} className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
                  Material abbuchen
                </label>
                <label className={`flex items-center gap-2.5 rounded-lg bg-background p-2.5 text-sm ${!canLinkCommercial ? "opacity-50" : ""}`}>
                  <input
                    type="checkbox"
                    checked={prepareInvoice}
                    disabled={!canLinkCommercial}
                    onChange={(e) => setPrepareInvoice(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                  />
                  Rechnung vorbereiten (Entwurf){!canLinkCommercial ? " – nur für Büro/Disponent/Admin" : ""}
                </label>
                <label className="flex items-center gap-2.5 rounded-lg bg-background p-2.5 text-sm">
                  <input type="checkbox" checked={archiveReportFlag} onChange={(e) => setArchiveReportFlag(e.target.checked)} className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
                  Bericht archivieren
                </label>
                <label className="flex items-center gap-2.5 rounded-lg bg-background p-2.5 text-sm opacity-60">
                  <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-4 w-4 rounded border-border text-brand focus:ring-brand" disabled />
                  Kunde erhält Bericht per E-Mail (benötigt einen verbundenen E-Mail-Anbieter, noch nicht angebunden)
                </label>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-background disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => canGoNext && setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={!canGoNext}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand to-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-40"
              >
                Weiter
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                onClick={() => setIsSubmitting(true)}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand to-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {isSubmitting ? "Wird gespeichert…" : "Bericht speichern"}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Rechte Seitenleiste: während der Eingabe dauerhaft sichtbar */}
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Wrench className="h-3.5 w-3.5" />
            Live-Übersicht
          </div>
          <div className="mt-3 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Auftrag</span>
              <span className="truncate font-medium text-foreground">{selectedOrder?.label ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Kunde</span>
              <span className="truncate font-medium text-foreground">{selectedOrder?.customerName ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Adresse</span>
              <span className="truncate font-medium text-foreground">{selectedOrder?.address ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Mitarbeiter</span>
              <span className="truncate font-medium text-foreground">{selectedEmployees.size || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Material</span>
              <span className="truncate font-medium text-foreground">{materialLines.length} Positionen</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Fotos</span>
              <span className="truncate font-medium text-foreground">{photoCount}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Arbeitszeit</span>
              <span className="truncate font-medium text-foreground">{formatMinutesAsHours(workedMinutes)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
              <span className="text-xs text-muted">Status</span>
              <span className="truncate font-medium text-foreground">{signatureName ? "Unterschrieben" : "Entwurf"}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
