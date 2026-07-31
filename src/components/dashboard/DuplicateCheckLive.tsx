"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { checkCustomerDuplicatesLive } from "@/app/(dashboard)/kunden/actions";

/**
 * Beobachtet Firmenname/E-Mail/Telefon/USt-IdNr. innerhalb des angegebenen
 * Formulars und fragt nach einer kurzen Tipppause (Debounce) unverbindlich
 * beim Server nach möglichen Dubletten. Rein informativ – blockiert nichts,
 * die eigentliche (verbindliche) Prüfung passiert weiterhin beim Speichern.
 */
export function DuplicateCheckLive({ formId, excludeId }: { formId: string; excludeId?: string }) {
  const [matches, setMatches] = useState<Array<{ id: string; label: string }>>([]);
  const [checking, setChecking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const watchedFields = ["company_name", "email", "phone", "vat_id"];

    function scheduleCheck() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        if (!form) return;
        const data = new FormData(form);
        const companyName = String(data.get("company_name") ?? "").trim();
        const email = String(data.get("email") ?? "").trim();
        const phone = String(data.get("phone") ?? "").trim();
        const vatId = String(data.get("vat_id") ?? "").trim();

        if (!companyName && !email && !phone && !vatId) {
          setMatches([]);
          return;
        }

        setChecking(true);
        try {
          const result = await checkCustomerDuplicatesLive({
            companyName,
            email,
            phone,
            vatId,
            excludeId,
          });
          setMatches(result);
        } catch {
          // still informell/optional – bei Fehlern still bleiben
        } finally {
          setChecking(false);
        }
      }, 600);
    }

    form.addEventListener("input", (event) => {
      const target = event.target as HTMLElement;
      if (target instanceof HTMLInputElement && watchedFields.includes(target.name)) {
        scheduleCheck();
      }
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [formId, excludeId]);

  if (!checking && matches.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" />
        {checking ? "Prüfe auf Dubletten…" : "Möglicherweise bereits vorhanden"}
      </div>
      {matches.length > 0 && (
        <ul className="mt-1.5 list-inside list-disc text-amber-800">
          {matches.map((m) => (
            <li key={m.id}>{m.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
