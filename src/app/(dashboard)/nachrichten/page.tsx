import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { conversationDisplayName, listMyConversations } from "@/lib/messaging";
import { formatDateTime } from "@/lib/date";

export default async function NachrichtenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) {
    return null;
  }

  const conversations = await listMyConversations(supabase, profile.id);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nachrichten</h1>
          <p className="mt-1 text-sm text-muted">
            Direktnachrichten und Gruppenchats mit deinen Kollegen, z. B. pro Abteilung.
          </p>
        </div>
        <Link
          href="/nachrichten/neu"
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Neue Nachricht
        </Link>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}

      {conversations.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-medium text-foreground">Noch keine Nachrichten</p>
          <p className="mt-1 text-sm text-muted">
            Starte eine Direktnachricht mit einem Kollegen oder erstelle einen Gruppenchat, z. B. für eine
            Abteilung.
          </p>
          <Link
            href="/nachrichten/neu"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Neue Nachricht
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border">
            {conversations.map((c) => {
              const name = conversationDisplayName(c);
              const initial = name.trim().charAt(0).toUpperCase() || "?";
              return (
                <li key={c.id}>
                  <Link
                    href={`/nachrichten/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-background"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-dark">
                      {initial}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {name}
                          {c.type === "group" && (
                            <span className="ml-1.5 text-xs font-normal text-muted">
                              ({c.otherMembers.length + 1})
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-muted">{formatDateTime(c.updatedAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-muted">
                          {c.lastMessage ? c.lastMessage.body : "Noch keine Nachrichten"}
                        </span>
                        {c.unread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Ungelesen" />
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
