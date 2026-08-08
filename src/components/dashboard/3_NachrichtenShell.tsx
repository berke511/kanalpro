import { MessageSquare } from "lucide-react";

// Rechte Spalte der geteilten Nachrichten-Ansicht, solange keine
// Konversation ausgewählt ist (Liste kommt aus layout.tsx). Auf dem Handy
// wird stattdessen die Liste angezeigt (siehe NachrichtenShell), diese
// Seite ist dort also nicht sichtbar.
export default async function NachrichtenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 p-6 text-center">
      {error && <p className="mb-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      {message && <p className="mb-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">{message}</p>}
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <MessageSquare className="h-6 w-6" />
      </span>
      <p className="mt-2 text-sm font-medium text-foreground">Wähle eine Konversation aus</p>
      <p className="max-w-xs text-sm text-muted">
        Links siehst du alle Direktnachrichten und Gruppenchats – oder starte eine neue Unterhaltung.
      </p>
    </div>
  );
}
