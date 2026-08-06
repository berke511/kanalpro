"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Cable,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Cog,
  Cylinder,
  Drill,
  Droplets,
  Fuel,
  HardHat,
  MapPin,
  MoreHorizontal,
  Package,
  QrCode,
  Save,
  SprayCan,
  Upload,
  type LucideIcon,
} from "lucide-react";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_DOCUMENT_CATEGORIES,
  MATERIAL_DOCUMENT_CATEGORY_LABELS,
  UNIT_OPTIONS,
  type MaterialCategory,
} from "@/lib/materials";

const STEPS = ["Allgemein", "Kategorie", "Lager", "Bestand", "Lieferant", "Fertig"];

const CATEGORY_ICONS: Record<MaterialCategory, LucideIcon> = {
  rohre: Cylinder,
  schlaeuche: Cable,
  dichtungen: CircleDot,
  fraeswerkzeuge: Drill,
  duesen: SprayCan,
  tv_kamera_zubehoer: Camera,
  psa: HardHat,
  verbrauchsmaterial: Package,
  ersatzteile: Cog,
  reinigungsmittel: Droplets,
  kraftstoffe: Fuel,
  sonstige: MoreHorizontal,
};

const DRAFT_STORAGE_KEY = "kanalpro:material:wizard-draft";

type WizardValues = {
  name: string;
  unit: string;
  category: string;
  location_id: string;
  regal: string;
  fach: string;
  quantity: string;
  min_quantity: string;
  warnLowStock: boolean;
  supplier_name: string;
  supplier_contact_name: string;
  supplier_phone: string;
  supplier_email: string;
  purchase_price: string;
  unit_price: string;
  tax_rate: string;
  generateQr: boolean;
  document_category: string;
  notes: string;
};

const DEFAULT_VALUES: WizardValues = {
  name: "",
  unit: "Stück",
  category: "",
  location_id: "",
  regal: "",
  fach: "",
  quantity: "",
  min_quantity: "",
  warnLowStock: true,
  supplier_name: "",
  supplier_contact_name: "",
  supplier_phone: "",
  supplier_email: "",
  purchase_price: "",
  unit_price: "",
  tax_rate: "19",
  generateQr: true,
  document_category: "sonstiges",
  notes: "",
};

function loadDraft(): WizardValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WizardValues>;
    return { ...DEFAULT_VALUES, ...parsed };
  } catch {
    return null;
  }
}

export function MaterialWizard({
  action,
  locationOptions,
  supplierOptions,
}: {
  action: (formData: FormData) => void;
  locationOptions: Array<{ id: string; name: string }>;
  supplierOptions: string[];
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<WizardValues>(() => loadDraft() ?? DEFAULT_VALUES);
  const [draftRestored] = useState(() => loadDraft() !== null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [customUnit, setCustomUnit] = useState(() => !UNIT_OPTIONS.includes(values.unit as (typeof UNIT_OPTIONS)[number]));

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentDragOver, setDocumentDragOver] = useState(false);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Objekt-URL für die Bildvorschau wird als abgeleiteter Wert berechnet
  // (nicht per setState im Effekt) – ein separater Effekt kümmert sich
  // ausschließlich um das Aufräumen (revokeObjectURL), sobald sich die Datei
  // ändert oder die Komponente unmountet.
  const photoPreviewUrl = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile]);
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  function set<K extends keyof WizardValues>(key: K, value: WizardValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values));
      setDraftMessage("Entwurf gespeichert – Bilder/Dokumente müssen beim Fortsetzen erneut ausgewählt werden.");
    } catch {
      setDraftMessage("Entwurf konnte nicht gespeichert werden.");
    }
    window.setTimeout(() => setDraftMessage(null), 4000);
  }

  function handleDocumentFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setDocumentFile(file);
    if (documentInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      documentInputRef.current.files = dt.files;
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10";
  const labelClass = "text-sm font-medium text-foreground";

  const canGoNext = step !== 0 || values.name.trim().length > 0;

  const locationDetail = [values.regal ? `Regal ${values.regal}` : null, values.fach ? `Fach ${values.fach}` : null].filter(Boolean).join(", ");
  const combinedNotes = [locationDetail ? `Lagerplatz: ${locationDetail}` : null, values.notes.trim() || null].filter(Boolean).join("\n\n");
  const locationLabel = locationOptions.find((l) => l.id === values.location_id)?.name ?? null;

  const summaryChecks = [
    { label: "Allgemeine Daten", done: values.name.trim().length > 0 && values.category.length > 0 },
    { label: "Lager", done: values.location_id.length > 0 },
    { label: "Lieferant", done: values.supplier_name.trim().length > 0 },
    { label: "Bestand", done: values.quantity.trim().length > 0 },
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Neues Material</h1>
            <p className="mt-1 text-sm text-muted">Erfassen Sie einen neuen Artikel für Ihr Lager. Alle Angaben können später jederzeit bearbeitet werden.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={saveDraft}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              <Save className="h-3.5 w-3.5" />
              Entwurf speichern
            </button>
            <Link href="/material" className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-background hover:text-foreground">
              Abbrechen
            </Link>
          </div>
        </div>

        {draftRestored && (
          <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand-dark">Ein gespeicherter Entwurf wurde geladen.</p>
        )}
        {draftMessage && <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">{draftMessage}</p>}

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
              {i < STEPS.length - 1 && <span className={`mx-2 h-px w-8 sm:w-14 ${i < step ? "bg-brand" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <form action={action} className="mt-6 space-y-6">
          <input type="hidden" name="category" value={values.category} />
          <input type="hidden" name="unit" value={values.unit} />
          <input type="hidden" name="min_quantity" value={values.warnLowStock ? values.min_quantity : ""} />
          <input type="hidden" name="generate_qr" value={values.generateQr ? "1" : "0"} />
          <input type="hidden" name="notes" value={combinedNotes} />

          {/* Schritt 1: Allgemein */}
          <div className={step === 0 ? "space-y-5" : "hidden"}>
            <div>
              <label className={labelClass}>Materialbild</label>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-background">
                  {photoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreviewUrl} alt="Vorschau" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-muted" />
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background">
                  <Upload className="h-3.5 w-3.5" />
                  + Materialbild hochladen
                  <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
                </label>
                <span className="text-xs text-muted">PNG, JPG, WEBP</span>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="wizard-name">
                Bezeichnung *
              </label>
              <input
                id="wizard-name"
                name="name"
                required
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="z. B. KG-Rohr DN 200"
                className={`mt-1 ${inputClass}`}
              />
            </div>

            <div>
              <label className={labelClass}>Einheit</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {UNIT_OPTIONS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      setCustomUnit(false);
                      set("unit", u);
                    }}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                      !customUnit && values.unit === u ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted hover:bg-card"
                    }`}
                  >
                    {u}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCustomUnit(true);
                    set("unit", "");
                  }}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    customUnit ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted hover:bg-card"
                  }`}
                >
                  Andere…
                </button>
              </div>
              {customUnit && (
                <input
                  value={values.unit}
                  onChange={(e) => set("unit", e.target.value)}
                  placeholder="Eigene Einheit eingeben"
                  className={`mt-2 ${inputClass}`}
                />
              )}
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-background p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <QrCode className="h-4 w-4" />
              </span>
              <div className="text-xs">
                <p className="font-medium text-foreground">Materialnummer</p>
                <p className="mt-0.5 text-muted">wird automatisch vergeben (z. B. M-00124)</p>
              </div>
            </div>
          </div>

          {/* Schritt 2: Kategorie */}
          <div className={step === 1 ? "space-y-4" : "hidden"}>
            <label className={labelClass}>Kategorie</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MATERIAL_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c];
                const selected = values.category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("category", c)}
                    className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3.5 text-center text-xs font-medium transition ${
                      selected ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted hover:bg-card"
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? "bg-brand text-white" : "bg-card text-muted"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {MATERIAL_CATEGORY_LABELS[c]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schritt 3: Lagerort */}
          <div className={step === 2 ? "space-y-4" : "hidden"}>
            <div>
              <label className={labelClass}>Lagerort</label>
              <div className="relative mt-1">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <select name="location_id" value={values.location_id} onChange={(e) => set("location_id", e.target.value)} className={`${inputClass} pl-9`}>
                  <option value="">— Lagerort suchen/wählen —</option>
                  {locationOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-xs text-muted">Weitere Lagerorte (z. B. Hauptlager, Fahrzeuglager, Außenlager) lassen sich in der Materialübersicht anlegen.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Regal (optional)</label>
                <input value={values.regal} onChange={(e) => set("regal", e.target.value)} placeholder="z. B. A" className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>Fach (optional)</label>
                <input value={values.fach} onChange={(e) => set("fach", e.target.value)} placeholder="z. B. 03" className={`mt-1 ${inputClass}`} />
              </div>
            </div>
            {locationDetail && <p className="text-xs text-muted">Wird als Lagerplatz-Hinweis in den Notizen vermerkt: „{locationDetail}“</p>}
          </div>

          {/* Schritt 4: Bestand */}
          <div className={step === 3 ? "space-y-4" : "hidden"}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Aktueller Bestand</label>
                <input type="number" step="0.01" min="0" name="quantity" value={values.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="0" className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>Mindestbestand</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={values.min_quantity}
                  onChange={(e) => set("min_quantity", e.target.value)}
                  disabled={!values.warnLowStock}
                  placeholder="0"
                  className={`mt-1 ${inputClass} disabled:opacity-40`}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={values.warnLowStock}
                onChange={(e) => set("warnLowStock", e.target.checked)}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
              Warnung bei Unterschreitung
            </label>
            <p className="text-xs text-muted">
              Der Bestand wird nach der Anlage ausschließlich über Materialbewegungen (Wareneingang, Entnahme, Rückgabe, Umlagerung, Inventur) verändert.
            </p>
          </div>

          {/* Schritt 5: Lieferant + Einkauf + QR + Dokumente + Notizen */}
          <div className={step === 4 ? "space-y-5" : "hidden"}>
            <div>
              <label className={labelClass}>Lieferant</label>
              <input
                name="supplier_name"
                value={values.supplier_name}
                onChange={(e) => set("supplier_name", e.target.value)}
                list="wizard-supplier-suggestions"
                placeholder="Lieferant auswählen oder eingeben"
                className={`mt-1 ${inputClass}`}
              />
              <datalist id="wizard-supplier-suggestions">
                {supplierOptions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelClass}>Ansprechpartner</label>
              <input name="supplier_contact_name" value={values.supplier_contact_name} onChange={(e) => set("supplier_contact_name", e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Telefonnummer</label>
                <input name="supplier_phone" value={values.supplier_phone} onChange={(e) => set("supplier_phone", e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>E-Mail</label>
                <input type="email" name="supplier_email" value={values.supplier_email} onChange={(e) => set("supplier_email", e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
            </div>

            <p className="border-t border-border pt-4 text-xs font-semibold uppercase tracking-wide text-muted">Einkauf</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Einkaufspreis (€)</label>
                <input type="number" step="0.01" min="0" name="purchase_price" value={values.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>Verkaufspreis (€)</label>
                <input type="number" step="0.01" min="0" name="unit_price" value={values.unit_price} onChange={(e) => set("unit_price", e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>MwSt. (%)</label>
                <input type="number" step="0.01" min="0" name="tax_rate" value={values.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
            </div>

            <label className="flex items-center gap-2 border-t border-border pt-4 text-sm text-foreground">
              <input
                type="checkbox"
                checked={values.generateQr}
                onChange={(e) => set("generateQr", e.target.checked)}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
              QR-Code automatisch erstellen
            </label>

            <div className="border-t border-border pt-4">
              <label className={labelClass}>Dokumente</label>
              <select name="document_category" value={values.document_category} onChange={(e) => set("document_category", e.target.value)} className={`mt-1 ${inputClass}`}>
                {MATERIAL_DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {MATERIAL_DOCUMENT_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDocumentDragOver(true);
                }}
                onDragLeave={() => setDocumentDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDocumentDragOver(false);
                  handleDocumentFiles(e.dataTransfer.files);
                }}
                className={`mt-2 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  documentDragOver ? "border-brand bg-brand-soft/40" : "border-border bg-background"
                }`}
              >
                <Upload className="h-5 w-5 text-muted" />
                {documentFile ? (
                  <p className="text-sm font-medium text-foreground">{documentFile.name}</p>
                ) : (
                  <p className="text-sm text-muted">Dateien hier ablegen oder</p>
                )}
                <label className="cursor-pointer text-sm font-medium text-brand hover:text-brand-dark">
                  Datei auswählen
                  <input ref={documentInputRef} type="file" name="document" className="hidden" onChange={(e) => handleDocumentFiles(e.target.files)} />
                </label>
                <p className="text-xs text-muted">Weitere Dokumente lassen sich nach dem Anlegen jederzeit in der Materialakte ergänzen.</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <label className={labelClass}>Notizen</label>
              <textarea value={values.notes} onChange={(e) => set("notes", e.target.value)} rows={4} className={`mt-1 ${inputClass}`} placeholder="Interne Informationen für Mitarbeiter…" />
              <p className="mt-1 text-xs text-muted">Interne Informationen für Mitarbeiter.</p>
            </div>
          </div>

          {/* Schritt 6: Zusammenfassung */}
          {step === 5 && (
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
                <p className="text-muted">Bezeichnung</p>
                <p className="font-medium text-foreground">{values.name || "—"}</p>
                <p className="text-muted">Kategorie</p>
                <p className="font-medium text-foreground">{values.category ? MATERIAL_CATEGORY_LABELS[values.category] : "—"}</p>
                <p className="text-muted">Einheit</p>
                <p className="font-medium text-foreground">{values.unit || "—"}</p>
                <p className="text-muted">Anfangsbestand</p>
                <p className="font-medium text-foreground">
                  {values.quantity || "0"} {values.unit}
                </p>
                <p className="text-muted">Lagerort</p>
                <p className="font-medium text-foreground">{locationLabel ?? "—"}</p>
                <p className="text-muted">Lieferant</p>
                <p className="font-medium text-foreground">{values.supplier_name || "—"}</p>
              </div>
              <p className="pt-1 text-xs text-muted">Bitte prüfen und dann speichern. Weitere Details lassen sich jederzeit in der Materialakte ergänzen.</p>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveDraft}
                className="hidden items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-background sm:flex"
              >
                <Save className="h-3.5 w-3.5" />
                Entwurf speichern
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
                  onClick={() => {
                    try {
                      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
                    } catch {
                      // Entwurf konnte nicht gelöscht werden – unkritisch, wird beim nächsten Speichern überschrieben.
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand to-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                >
                  <Check className="h-4 w-4" />
                  Material anlegen
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Rechte Seitenleiste: Live-Vorschau */}
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Boxes className="h-3.5 w-3.5" />
            Live-Vorschau
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-semibold text-white">
              {photoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreviewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (values.name.trim().slice(0, 2) || "M").toUpperCase()
              )}
            </div>
            <p className="truncate text-sm font-semibold text-foreground">{values.name || "Neues Material"}</p>
          </div>
          <div className="mt-4 space-y-2.5 border-t border-border pt-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Kategorie</span>
              <span className="truncate font-medium text-foreground">{values.category ? MATERIAL_CATEGORY_LABELS[values.category] : "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Bestand</span>
              <span className="truncate font-medium text-foreground">
                {values.quantity || "0"} {values.unit}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Lager</span>
              <span className="truncate font-medium text-foreground">{locationLabel ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">Lieferant</span>
              <span className="truncate font-medium text-foreground">{values.supplier_name || "—"}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
