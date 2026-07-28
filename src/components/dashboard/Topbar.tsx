import { signOut } from "@/app/(auth)/actions";

export function Topbar({
  companyName,
  userName,
}: {
  companyName: string;
  userName: string | null;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div>
        <p className="text-sm font-semibold">{companyName}</p>
        {userName && <p className="text-xs text-muted">{userName}</p>}
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
