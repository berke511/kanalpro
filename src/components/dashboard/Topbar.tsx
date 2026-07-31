import { signOut } from "@/app/(auth)/actions";
import { MobileNav } from "@/components/dashboard/MobileNav";

export function Topbar({
  companyName,
  userName,
}: {
  companyName: string;
  userName: string | null;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-4 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
        <div>
          <p className="text-sm font-semibold">{companyName}</p>
          {userName && <p className="text-xs text-muted">{userName}</p>}
        </div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted hover:bg-background hover:text-foreground"
        >
          Abmelden
        </button>
      </form>
    </header>
  );
}
