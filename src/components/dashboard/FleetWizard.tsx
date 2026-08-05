"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  FLEET_DOCUMENT_CATEGORIES,
  FLEET_DOCUMENT_CATEGORY_LABELS,
  FLEET_KINDS,
  FLEET_KIND_LABELS,
  FLEET_STATUSES,
  FLEET_STATUS_LABELS,
  FUEL_TYPE_LABELS,
  FUEL_TYPES,
  OWNERSHIP_LABELS,
  OWNERSHIP_TYPES,
} from "@/lib/fleet";

const STEPS = ["Typ & Bezeichnung", "Stammdaten", "Technische Daten", "Wartungsdaten", "Dokumente", "Zusammenfassung"];

export function FleetWizard({
  action,
  fleetOptions,
}: {
  action: (formData: FormData) => void;
  fleetOptions: Array<{ id: string; label: string }>;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    kind: "fahrzeug",
    name: "",
    license_plate: "",
    status: "verfuegbar",
    inventory_number: "",
    manufacturer: "",
    model: "",
    year_built: "",
    location: "",
    service_area: "",
    ownership: "",
    fuel_type: "",
    odometer_km: "",
    operating_hours: "",
    odometer_interval_km: "",
    operating_hours_interval: "",
    default_crew_size: "",
    max_crew_size: "",
    default_equipment: "",
    linked_vehicle_id: "",
    last_maintenance_at: "",
    next_maintenance_at: "",
    next_maintenance_note: "",
    tuv_due_date: "",
    uvv_due_date: "",
    insurance_due_date: "",
    leasing_end_date: "",
    notes: "",
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

      {/* Schritt 1: Typ & Bezeichnung */}
      <div className={step === 0 ? "space-y-4" : "hidden"}>
        <div>
          <label className={labelClass}>Art des Eintrags</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FLEET_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set("kind", k)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  values.kind === k ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted hover:bg-card"
                }`}
              >
                {FLEET_KIND_LABELS[k]}
              </button>
            ))}
          </div>
          <input type="hidden" name="kind" value={values.kind} />
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
            placeholder="z. B. Kanal-TV-Fahrzeug"
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Kennzeichen</label>
            <input name="license_plate" value={values.license_plate} onChange={(e) => set("license_plate", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" value={values.status} onChange={(e) => set("status", e.target.value)} className={`mt-1 ${inputClass}`}>
              {FLEET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {FLEET_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schritt 2: Stammdaten */}
      <div className={step === 1 ? "space-y-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Inventarnummer</label>
            <input name="inventory_number" value={values.inventory_number} onChange={(e) => set("inventory_number", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Baujahr</label>
            <input type="number" name="year_built" value={values.year_built} onChange={(e) => set("year_built", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Hersteller</label>
            <input name="manufacturer" value={values.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Modell</label>
            <input name="model" value={values.model} onChange={(e) => set("model", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Standort</label>
            <input name="location" value={values.location} onChange={(e) => set("location", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Einsatzgebiet</label>
            <input name="service_area" value={values.service_area} onChange={(e) => set("service_area", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Eigentum / Leasing</label>
          <select name="ownership" value={values.ownership} onChange={(e) => set("ownership", e.target.value)} className={`mt-1 ${inputClass}`}>
            <option value="">— Nicht angegeben —</option>
            {OWNERSHIP_TYPES.map((o) => (
              <option key={o} value={o}>
                {OWNERSHIP_LABELS[o]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Schritt 3: Technische Daten */}
      <div className={step === 2 ? "space-y-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Kraftstoffart</label>
            <select name="fuel_type" value={values.fuel_type} onChange={(e) => set("fuel_type", e.target.value)} className={`mt-1 ${inputClass}`}>
              <option value="">— Nicht angegeben —</option>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {FUEL_TYPE_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Verknüpftes Fahrzeug / Maschine</label>
            <select name="linked_vehicle_id" value={values.linked_vehicle_id} onChange={(e) => set("linked_vehicle_id", e.target.value)} className={`mt-1 ${inputClass}`}>
              <option value="">Keine Verknüpfung</option>
              {fleetOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Kilometerstand</label>
            <input type="number" step="0.1" name="odometer_km" value={values.odometer_km} onChange={(e) => set("odometer_km", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Betriebsstunden</label>
            <input type="number" step="0.1" name="operating_hours" value={values.operating_hours} onChange={(e) => set("operating_hours", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Wartungsintervall (km)</label>
            <input
              type="number"
              step="0.1"
              name="odometer_interval_km"
              value={values.odometer_interval_km}
              onChange={(e) => set("odometer_interval_km", e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className={labelClass}>Wartungsintervall (Std.)</label>
            <input
              type="number"
              step="0.1"
              name="operating_hours_interval"
              value={values.operating_hours_interval}
              onChange={(e) => set("operating_hours_interval", e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
        </div>
        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted">Rohr- & Kanalbranche</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Standardbesatzung</label>
            <input type="number" name="default_crew_size" value={values.default_crew_size} onChange={(e) => set("default_crew_size", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Maximale Besatzung</label>
            <input type="number" name="max_crew_size" value={values.max_crew_size} onChange={(e) => set("max_crew_size", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Standardausrüstung</label>
          <textarea name="default_equipment" value={values.default_equipment} onChange={(e) => set("default_equipment", e.target.value)} rows={2} className={`mt-1 ${inputClass}`} />
        </div>
      </div>

      {/* Schritt 4: Wartungsdaten */}
      <div className={step === 3 ? "space-y-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Letzte Wartung</label>
            <input type="date" name="last_maintenance_at" value={values.last_maintenance_at} onChange={(e) => set("last_maintenance_at", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Nächste Wartung</label>
            <input type="date" name="next_maintenance_at" value={values.next_maintenance_at} onChange={(e) => set("next_maintenance_at", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Hinweis zur nächsten Wartung</label>
          <input name="next_maintenance_note" value={values.next_maintenance_note} onChange={(e) => set("next_maintenance_note", e.target.value)} className={`mt-1 ${inputClass}`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>TÜV fällig</label>
            <input type="date" name="tuv_due_date" value={values.tuv_due_date} onChange={(e) => set("tuv_due_date", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>UVV fällig</label>
            <input type="date" name="uvv_due_date" value={values.uvv_due_date} onChange={(e) => set("uvv_due_date", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Versicherung läuft ab</label>
            <input type="date" name="insurance_due_date" value={values.insurance_due_date} onChange={(e) => set("insurance_due_date", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Leasing-Ende</label>
            <input type="date" name="leasing_end_date" value={values.leasing_end_date} onChange={(e) => set("leasing_end_date", e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Notizen</label>
          <textarea name="notes" value={values.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={`mt-1 ${inputClass}`} />
        </div>
      </div>

      {/* Schritt 5: Dokumente */}
      <div className={step === 4 ? "space-y-4" : "hidden"}>
        <div>
          <label className={labelClass}>Foto (optional)</label>
          <input type="file" name="photo" accept="image/*" className="mt-1 w-full text-sm" />
        </div>
        <div>
          <label className={labelClass}>Erstes Dokument (optional)</label>
          <select name="document_category" defaultValue="sonstiges" className={`mt-1 ${inputClass}`}>
            {FLEET_DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {FLEET_DOCUMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <input type="file" name="document" className="mt-2 w-full text-sm" />
          <p className="mt-1 text-xs text-muted">Weitere Dokumente lassen sich nach dem Anlegen jederzeit in der Fahrzeugakte ergänzen.</p>
        </div>
      </div>

      {/* Schritt 6: Zusammenfassung */}
      {step === 5 && (
        <div className="space-y-3 rounded-xl bg-background p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Zusammenfassung</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <p className="text-muted">Typ</p>
            <p className="font-medium text-foreground">{FLEET_KIND_LABELS[values.kind]}</p>
            <p className="text-muted">Bezeichnung</p>
            <p className="font-medium text-foreground">{values.name || "—"}</p>
            <p className="text-muted">Kennzeichen</p>
            <p className="font-medium text-foreground">{values.license_plate || "—"}</p>
            <p className="text-muted">Status</p>
            <p className="font-medium text-foreground">{FLEET_STATUS_LABELS[values.status]}</p>
            <p className="text-muted">Hersteller / Modell</p>
            <p className="font-medium text-foreground">{[values.manufacturer, values.model].filter(Boolean).join(" ") || "—"}</p>
            <p className="text-muted">Standort</p>
            <p className="font-medium text-foreground">{values.location || "—"}</p>
            <p className="text-muted">Nächste Wartung</p>
            <p className="font-medium text-foreground">{values.next_maintenance_at || "—"}</p>
            <p className="text-muted">TÜV fällig</p>
            <p className="font-medium text-foreground">{values.tuv_due_date || "—"}</p>
          </div>
          <p className="pt-1 text-xs text-muted">Bitte prüfen und dann speichern. Weitere Details lassen sich jederzeit in der Fahrzeugakte ergänzen.</p>
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
            Eintrag anlegen
          </button>
        )}
      </div>
    </form>
  );
}
