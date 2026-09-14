import Link from "next/link";
import { MessageSquare, MessageSquarePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { listMyConversations } from "@/lib/messaging";
import { ConversationListPane } from "@/components/dashboard/ConversationListPane";
import { NachrichtenShell } from "@/components/dashboard/NachrichtenShell";

// Geteilte Ansicht (Liste + Chat nebeneinander) statt einzelner Seiten mit
// vollem Seitenwechsel: Next.js behält dieses Layout beim Navigieren
// zwischen /nachrichten, /nachrichten/[id] und /nachrichten/neu bei, nur
// {children} (die rechte Spalte) wird ausgetauscht. Die Konversationsliste
// bleibt dadurch links immer sichtbar und lädt nicht bei jedem Klick neu.
export default async function NachrichtenLayout({ children }: { children: React.ReactNode }) {
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
  const unreadCount = conversations.filter((c) => c.unread).length;

  return (
    <NachrichtenShell
      list={
        <>
          <div className="relative overflow-hidden rounded-b-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-4 pb-5 pt-4 text-white shadow-lg shadow-brand/25 sm:px-5">
            <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/15 text-white">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold tracking-tight">Nachrichten</h1>
                  <p className="truncate text-[11px] text-white/75">
                    {unreadCount > 0 ? `${unreadCount} ungelesen` : "Alles gelesen"}
                  </p>
                </div>
              </div>
              <Link
                href="/nachrichten/neu"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white text-brand-dark shadow-md transition-colors hover:bg-white/90"
                aria-label="Neue Nachricht"
                title="Neue Nachricht"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <ConversationListPane conversations={conversations} />
        </>
      }
    >
      {children}
    </NachrichtenShell>
  );
}
