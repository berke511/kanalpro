"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { CUSTOMER_REQUIRED_FIELD_SLOTS } from "@/lib/customers";

/**
 * Kleine, isolierte Client-Komponente: beobachtet die Eingaben eines
 * Formulars (per id) und zeigt live an, wie viele der definierten
 * Felder-„Slots“ bereits ausgefüllt sind. Der Rest der Kundenverwaltung
 * bleibt bewusst serverseitig gerendert – hier lohnt sich das bisschen
 * Client-JS, weil eine Live-Anzeige ohne es nicht möglich ist.
 */
export function RequiredFieldsProgress({ formId }: { formId: string }) {
  const [filledKeys, setFilledKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    function recompute() {
      if (!form) return;
      const data = new FormData(form);
      const next = new Set<string>();
      for (const slot of CUSTOMER_REQUIRED_FIELD_SLOTS) {
        const filled = slot.fieldNames.some((name) => {
          const value = data.get(name);
          return typeof value === "string" && value.trim().length > 0;
        });
        if (filled) next.add(slot.key);
      }
      setFilledKeys(next);
    }

    recompute();
    form.addEventListener("input", recompute);
    form.addEventListener("change", recompute);
    return () => {
      form.removeEventListener("input", recompute);
      form.removeEventListener("change", recompute);
    };
  }, [formId]);

  const total = CUSTOMER_REQUIRED_FIELD_SLOTS.length;
  const filledCount = filledKeys.size;
  const missing = CUSTOMER_REQUIRED_FIELD_SLOTS.filter((s) => !filledKeys.has(s.key));
  const percent = total === 0 ? 0 : Math.round((filledCount / total) * 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between text-sm font-medium">
        <span>Fortschritt</span>
        <span className="text-muted">
          {filledCount} von {total} Feldern
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      {missing.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {missing.map((slot) => (
            <li key={slot.key} className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-border" />
              {slot.label}
              {slot.hard && <span className="text-brand">· Pflicht</span>}
            </li>
          ))}
        </ul>
      )}
      {missing.length === 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Alle Felder ausgefüllt
        </p>
      )}
    </div>
  );
}
