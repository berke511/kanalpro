"use client";

import { useState } from "react";

type Employee = { id: string; full_name: string | null; role: string };

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  mitarbeiter: "Mitarbeiter",
};

export function NewConversationForm({
  action,
  employees,
}: {
  action: (formData: FormData) => void;
  employees: Employee[];
}) {
  const [convType, setConvType] = useState<"direct" | "group">("direct");

  return (
    <form action={action} className="mt-6 space-y-6">
      <div>
        <span className="text-sm font-medium">Art</span>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setConvType("direct")}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              convType === "direct"
                ? "border-brand/30 bg-brand-soft text-brand-dark"
                : "border-border bg-card hover:bg-background"
            }`}
          >
            Direktnachricht
          </button>
          <button
            type="button"
            onClick={() => setConvType("group")}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              convType === "group"
                ? "border-brand/30 bg-brand-soft text-brand-dark"
                : "border-border bg-card hover:bg-background"
            }`}
          >
            Gruppenchat
          </button>
        </div>
        <input type="hidden" name="conv_type" value={convType} />
      </div>

      {convType === "group" && (
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            Gruppenname *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="z. B. Außendienst Köln"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
      )}

      <div>
        <span className="text-sm font-medium">{convType === "direct" ? "Empfänger *" : "Mitglieder *"}</span>
        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
          {employees.map((e) => (
            <label
              key={e.id}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm hover:bg-background"
            >
              <span className="flex items-center gap-2">
                <input
                  type={convType === "direct" ? "radio" : "checkbox"}
                  name={convType === "direct" ? "member_id" : "member_ids"}
                  value={e.id}
                  required={convType === "direct"}
                  className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                />
                {e.full_name || "Unbenannt"}
              </span>
              <span className="text-xs text-muted">{ROLE_LABELS[e.role] ?? e.role}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        {convType === "direct" ? "Nachricht starten" : "Gruppe erstellen"}
      </button>
    </form>
  );
}
