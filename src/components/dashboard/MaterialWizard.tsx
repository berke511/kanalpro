"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, QrCode } from "lucide-react";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_DOCUMENT_CATEGORIES,
  MATERIAL_DOCUMENT_CATEGORY_LABELS,
} from "@/lib/materials";

const STEPS = ["Allgemein", "Kategorie", "Lagerort", "Bestand", "Lieferant", "Preise", "QR-Code", "Bild & Dokumente", "Zusammenfassung"];

export function MaterialWizard({
  action,
  locationOptions,
}: {
  action: (formData: FormData) => void;
  locationOptions: Array<{ id: string; name: string }>;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    name: "",
    unit: "Stück",
    category: "",
    location_id: "",
    quantity: "",
    min_quantity: "",
    supplier_name: "",
    supplier_contact_name: "",
    supplier_phone: "",
    supplier_email: "",
    purchase_price: "",
    unit_price: "",
    notes: "",
    document_category: "sonstiges",
  });

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10";
  const labelClass = "text-sm font-medium text-foreground";

  const canGoNext = step !== 0 || values.name.trim().length > 0;

  return (
    <form action={action} className="space-y-6">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex shrink-0 items-center gap-1.5">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                i < step ? "bg-brand text-white" : i === step ? "bg-gradient-to-br from-brand to-brand-dark text-white" : "bg-background text-muted"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`whitespace-nowrap text-xs font-medium ${i === step ? "text-foreground" : "text-muted"}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-border" />}
          </div>
        ))}
      </div>

      {/* Schritt 1: Allgemeine Informationen */}
      <div className={step === 0 ? "space-y-4" : "hidden"}>
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
          <input
            name="unit"
            value={values.unit}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="Stück, Meter, Liter, kg…"
            list="wizard-unit-suggestions"
            className={`mt-1 ${inputClass}`}
          />
          <datalist id="wizard-unit-suggestions">
            <option value="Stück" />
            <option value="Meter" />
            <option value="Liter" />
            <option value="kg" />
            <option value="Paar" />
            <option value="Rolle" />
            <option value="Karton" />
          </datalist>
        </div>
        <div>
          <label className={labelClass}>Notizen</label>
          <textarea name="notes" value={values.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`mt-1 ${inputClass}`} />
        </div>
      </div>

      {/* Schritt 2: Kategorie */}
      <div className={step === 1 ? "space-y-4" : "hidden"}>
        <label className={labelClass}>Kategorie</label>
        <div className="grid grid-cols-2 gap-2">
          {MATERIAL_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set("category", c)}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
                values.category === c ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted hover:bg-card"
              }`}
            >
              {MATERIAL_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <input type="hidden" name="category" value={values.category} />
      </div>

      {/* Schritt 3: Lagerort */}
      <div className={step === 2 ? "space-y-4" : "hidden"}>
        <div>
          <label className={labelClass}>Lagerort</label>
          <select name="location_id" value={values.location_id} onChange={(e) => set("location_id", e.target.value)} className={`mt-1 ${inputClass}`}>
            <option value="">— Nicht angegeben —</option>
            {locationOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Weitere Lagerorte (z. B. Hauptlager, Fahrzeuglager, Außenlager) lassen sich in der Materialübersicht anlegen.
          </p>
        </div>
      </div>

      {/* Schritt 4: Bestand & Mindestbestand */}
      <div className={step === 3 ? "space-y-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Anfangsbestand</label>
            <input type="number" step="0.01" min="0" name="quantity" value={values.quantity} onChange={(e) => set("quantity", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Mindestbestand</label>
            <input type="number" step="0.01" min="0" name="min_quantity" value={values.min_quantity} onChange={(e) => set("min_quantity", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <p className="text-xs text-muted">
          Der Bestand wird nach der Anlage ausschließlich über Materialbewegungen (Wareneingang, Entnahme, Rückgabe, Umlagerung, Inventur) verändert.
        </p>
      </div>

      {/* Schritt 5: Lieferant */}
      <div className={step === 4 ? "space-y-4" : "hidden"}>
        <div>
          <label className={labelClass}>Lieferant</label>
          <input name="supplier_name" value={values.supplier_name} onChange={(e) => set("supplier_name", e.target.value)} className={`mt-1 ${inputClass}`} />
        </div>
        <div>
          <label className={labelClass}>Ansprechpartner</label>
          <input name="supplier_contact_name" value={values.supplier_contact_name} onChange={(e) => set("supplier_contact_name", e.target.value)} className={`mt-1 ${inputClass}`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Telefon</label>
            <input name="supplier_phone" value={values.supplier_phone} onChange={(e) => set("supplier_phone", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>E-Mail</label>
            <input type="email" name="supplier_email" value={values.supplier_email} onChange={(e) => set("supplier_email", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
      </div>

      {/* Schritt 6: Preise */}
      <div className={step === 5 ? "space-y-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Einkaufspreis (€)</label>
            <input type="number" step="0.01" min="0" name="purchase_price" value={values.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Verkaufspreis (€)</label>
            <input type="number" step="0.01" min="0" name="unit_price" value={values.unit_price} onChange={(e) => set("unit_price", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
      </div>

      {/* Schritt 7: QR-/Barcode */}
      <div className={step === 6 ? "space-y-4" : "hidden"}>
        <div className="flex items-center gap-3 rounded-xl bg-background p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <QrCode className="h-5 w-5" />
          </span>
          <div className="text-sm">
            <p className="font-medium text-foreground">QR-Code wird automatisch generiert</p>
            <p className="mt-0.5 text-xs text-muted">
              Beim Anlegen erhält das Material eine fortlaufende Materialnummer (z. B. M-00042), die zugleich als QR-/Barcode für das schnelle Ein- und
              Ausbuchen dient. Der Code lässt sich anschließend in der Materialakte anzeigen und ausdrucken.
            </p>
          </div>
        </div>
      </div>

      {/* Schritt 8: Bild & Dokumente */}
      <div className={step === 7 ? "space-y-4" : "hidden"}>
        <div>
          <label className={labelClass}>Bild (optional)</label>
          <input type="file" name="photo" accept="image/*" className="mt-1 w-full text-sm" />
        </div>
        <div>
          <label className={labelClass}>Erstes Dokument (optional)</label>
          <select
            name="document_category"
            value={values.document_category}
            onChange={(e) => set("document_category", e.target.value)}
            className={`mt-1 ${inputClass}`}
          >
            {MATERIAL_DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {MATERIAL_DOCUMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <input type="file" name="document" className="mt-2 w-full text-sm" />
          <p className="mt-1 text-xs text-muted">Weitere Dokumente lassen sich nach dem Anlegen jederzeit in der Materialakte ergänzen.</p>
        </div>
      </div>

      {/* Schritt 9: Zusammenfassung */}
      {step === 8 && (
        <div className="space-y-3 rounded-xl bg-background p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Zusammenfassung</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
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
            <p className="text-muted">Mindestbestand</p>
            <p className="font-medium text-foreground">{values.min_quantity || "—"}</p>
            <p className="text-muted">Lieferant</p>
            <p className="font-medium text-foreground">{values.supplier_name || "—"}</p>
            <p className="text-muted">Einkaufspreis</p>
            <p className="font-medium text-foreground">{values.purchase_price ? `${values.purchase_price} €` : "—"}</p>
            <p className="text-muted">Verkaufspreis</p>
            <p className="font-medium text-foreground">{values.unit_price ? `${values.unit_price} €` : "—"}</p>
          </div>
          <p className="pt-1 text-xs text-muted">Bitte prüfen und dann speichern. Weitere Details lassen sich jederzeit in der Materialakte ergänzen.</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
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
          <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand to-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md">
            <Check className="h-4 w-4" />
            Material anlegen
          </button>
        )}
      </div>
    </form>
  );
}
