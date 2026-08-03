"use client";

import { useRouter } from "next/navigation";

const OPTIONS = [25, 50, 100];

export function PageSizeSelect({ baseHref, value }: { baseHref: string; value: number }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      Zeilen pro Seite
      <select
        value={value}
        onChange={(e) => {
          const sep = baseHref.includes("?") ? "&" : "?";
          router.push(`${baseHref}${sep}pageSize=${e.target.value}`);
        }}
        className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium outline-none focus:border-brand"
      >
        {OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
