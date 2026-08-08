import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { NotificationBell, type NotificationItem } from "@/components/dashboard/NotificationBell";

export function Topbar({
  companyName,
  userName,
  notifications,
}: {
  companyName: string;
  userName: string | null;
  notifications: NotificationItem[];
}) {
  const initial = (userName || companyName || "?").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3.5 shadow-sm backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-dark sm:flex">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{companyName}</p>
          {userName && <p className="truncate text-xs text-muted">{userName}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell items={notifications} />
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Abmelden</span>
          </button>
        </form>
      </div>
    </header>
  );
}
