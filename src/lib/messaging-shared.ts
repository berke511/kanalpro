import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
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

  return (
    <NachrichtenShell
      list={
        <>
          <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5">
            <h1 className="text-lg font-semibold tracking-tight">Nachrichten</h1>
            <Link
              href="/nachrichten/neu"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-dark"
              aria-label="Neue Nachricht"
              title="Neue Nachricht"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Link>
          </div>
          <ConversationListPane conversations={conversations} />
        </>
      }
    >
      {children}
    </NachrichtenShell>
  );
}
