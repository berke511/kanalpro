"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(dashboard)/mitarbeiter/actions";

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
}

export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleItemClick(item: NotificationItem) {
    setOpen(false);
    startTransition(async () => {
      await markNotificationRead(item.id);
      router.refresh();
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-brand/30 hover:bg-brand-soft hover:text-brand"
      >
        <Bell className="h-4 w-4" />
        {items.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] animate-fade-in rounded-2xl border border-border bg-card p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-semibold text-foreground">Benachrichtigungen</p>
            {items.length > 0 && (
              <button type="button" onClick={handleMarkAll} className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-dark">
                <CheckCheck className="h-3.5 w-3.5" />
                Alle gelesen
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted">Keine neuen Benachrichtigungen.</p>}
            {items.map((item) =>
              item.link ? (
                <Link
                  key={item.id}
                  href={item.link}
                  onClick={() => handleItemClick(item)}
                  className="block rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-background"
                >
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.body && <p className="mt-0.5 text-xs text-muted">{item.body}</p>}
                  <p className="mt-1 text-[11px] text-muted">{timeAgo(item.createdAt)}</p>
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="block w-full rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-background"
                >
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.body && <p className="mt-0.5 text-xs text-muted">{item.body}</p>}
                  <p className="mt-1 text-[11px] text-muted">{timeAgo(item.createdAt)}</p>
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
