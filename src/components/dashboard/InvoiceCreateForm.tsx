"use client";

import { useState } from "react";
import { FileText, Receipt } from "lucide-react";
import { todayBerlinISO } from "@/lib/date";

export function InvoiceCreateForm({
  action,
  defaultKind,
  defaultCustomerId,
  defaultOrderId,
  customerOptions,
  orderOptions,
}: {
  action: (formData: FormData) => void;
  defaultKind: "angebot" | "rechnung";
  defaultCustomerId?: string;
  defaultOrderId?: string;
  customerOptions: Array<{ id: string; label: string }>;
  orderOptions: Array<{ id: string; label: string; customerId: string | null }>;
}) {
  const [kind, setKind] = useState<"angebot" | "rechnung">(defaultKind);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [submitToken] = useState(() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10";
  const labelClass = "text-xs font-medium text-muted";

  const filteredOrders = customerId ? orderOptions.filter((o) => !o.customerId || o.customerId === customerId) : orderOptions;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="client_submit_token" value={submitToken} />
      <input type="hidden" name="kind" value={kind} />

      <div>
        <label className={labelClass}>Dokumenttyp</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setKind("angebot")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
              kind === "angebot" ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted"
            }`}
          >
            <FileText className="h-4 w-4" />
            Angebot
          </button>
          <button
            type="button"
            onClick={() => setKind("rechnung")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
              kind === "rechnung" ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted"
            }`}
          >
            <Receipt className="h-4 w-4" />
            Rechnung
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="customer_id">
          Kunde
        </label>
        <select id="customer_id" name="customer_id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={`mt-1 ${inputClass}`}>
          <option value="">— Kein Kunde ausgewählt —</option>
          {customerOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {filteredOrders.length > 0 && (
        <div>
          <label className={labelClass} htmlFor="order_id">
            Auftrag / Projekt (optional)
          </label>
          <select id="order_id" name="order_id" defaultValue={defaultOrderId ?? ""} className={`mt-1 ${inputClass}`}>
            <option value="">— Kein Auftrag —</option>
            {filteredOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="invoice_number">
          Nummer (optional)
        </label>
        <input id="invoice_number" name="invoice_number" placeholder="Wird automatisch vergeben (AN-/RE-…)" className={`mt-1 ${inputClass}`} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="issue_date">
            Datum
          </label>
          <input type="date" id="issue_date" name="issue_date" defaultValue={todayBerlinISO()} className={`mt-1 ${inputClass}`} />
        </div>
        <div>
          <label className={labelClass} htmlFor="due_valid_date">
            {kind === "angebot" ? "Gültig bis" : "Fälligkeitsdatum"}
          </label>
          <input type="date" id="due_valid_date" name={kind === "angebot" ? "valid_until" : "due_date"} className={`mt-1 ${inputClass}`} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="tax_rate">
          MwSt.-Satz (%)
        </label>
        <input type="number" step="0.01" min="0" id="tax_rate" name="tax_rate" defaultValue={19} className={`mt-1 ${inputClass}`} />
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">
          Notizen (optional)
        </label>
        <textarea id="notes" name="notes" rows={3} className={`mt-1 ${inputClass}`} />
      </div>

      <p className="text-xs text-muted">
        Positionen (Leistungen/Material) werden im nächsten Schritt in der Detailansicht hinzugefügt.
      </p>

      <button type="submit" className="w-full rounded-lg bg-gradient-to-br from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md">
        {kind === "angebot" ? "Angebot anlegen" : "Rechnung anlegen"}
      </button>
    </form>
  );
}
