"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { conversationDisplayName } from "@/lib/messaging-shared";
import type { ConversationSummary } from "@/lib/messaging";

const TIME_ZONE = "Europe/Berlin";

type FilterKey = "all" | "unread" | "group";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Alle" },
  { key: "unread", label: "Ungelesen" },
  { key: "group", label: "Gruppen" },
];

/** Zeigt Uhrzeit für heute, Wochentag für die letzten 7 Tage, sonst TT.MM.JJ. */
function formatListTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });
  const todayKey = dayFmt.format(new Date());
  const key = dayFmt.format(date);

  if (key === todayKey) {
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
  }

  const diffDays = Math.round((Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${key}T00:00:00Z`)) / 86_400_000);
  if (diffDays >= 1 && diffDays < 7) {
    return date.toLocaleDateString("de-DE", { weekday: "short", timeZone: TIME_ZONE });
  }
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: TIME_ZONE });
}

/**
 * Linke Spalte der geteilten Nachrichten-Ansicht: Suche, Filter
 * (Alle/Ungelesen/Gruppen) und die eigentliche Konversationsliste. Bewusst
 * als Client-Komponente, da sie den aktuellen Pfad kennen muss (welche
 * Konversation ist gerade offen, um sie hervorzuheben) und clientseitig
 * filtert/sucht, ohne dafür den Server erneut zu bemühen.
 */
export function ConversationListPane({ conversations }: { conversations: ConversationSummary[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const unreadCount = conversations.filter((c) => c.unread).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === "unread" && !c.unread) return false;
      if (filter === "group" && c.type !== "group") return false;
      if (!q) return true;
      const name = conversationDisplayName(c).toLowerCase();
      const preview = c.lastMessage?.body?.toLowerCase() ?? "";
      return name.includes(q) || preview.includes(q);
    });
  }, [conversations, query, filter]);

  return (
    <>
      <div className="px-4 pb-3 sm:px-5">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-brand">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
        <div className="mt-2.5 flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f.key ? "bg-brand text-white" : "bg-background text-muted hover:text-foreground"
              }`}
            >
              {f.label}
              {f.key === "unread" && unreadCount > 0 ? ` · ${unreadCount}` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 sm:px-2.5">
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted">
            {conversations.length === 0 ? "Noch keine Nachrichten" : "Keine Treffer"}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((c) => {
              const name = conversationDisplayName(c);
              const initial = name.trim().charAt(0).toUpperCase() || "?";
              const active = pathname === `/nachrichten/${c.id}`;
              return (
                <li key={c.id}>
                  <Link
                    href={`/nachrichten/${c.id}`}
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors ${
                      active ? "bg-brand-soft" : "hover:bg-background"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-semibold text-white shadow-sm">
                      {initial}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm font-medium ${active ? "text-brand-dark" : "text-foreground"}`}>
                          {name}
                          {c.type === "group" && (
                            <span className="ml-1.5 text-xs font-normal text-muted">({c.otherMembers.length + 1})</span>
                          )}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted">{formatListTimestamp(c.updatedAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-muted">
                          {c.lastMessage ? c.lastMessage.body : "Noch keine Nachrichten"}
                        </span>
                        {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Ungelesen" />}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
