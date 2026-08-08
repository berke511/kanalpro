import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Wird auch von Client-Komponenten gebraucht (z. B. ConversationListPane) –
// diese Datei selbst darf wegen "server-only" oben nicht in einer
// Client-Komponente importiert werden, die reine Hilfsfunktion aber schon.
export { conversationDisplayName } from "@/lib/messaging-shared";

export type ConversationSummary = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  updatedAt: string;
  otherMembers: Array<{ id: string; full_name: string | null }>;
  lastMessage: { body: string; created_at: string; sender_id: string | null } | null;
  unread: boolean;
};

/**
 * Lädt alle Konversationen, an denen `profileId` beteiligt ist, inkl.
 * letzter Nachricht (Vorschau) und Ungelesen-Status – sortiert nach
 * letzter Aktivität. Bewusst in mehreren einfachen Abfragen statt einem
 * komplexen Join/View gehalten, konsistent mit dem übrigen, pragmatischen
 * Datenzugriffsstil der App.
 */
export async function listMyConversations(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<ConversationSummary[]> {
  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("profile_id", profileId);

  const conversationIds = (memberships ?? []).map((m) => m.conversation_id);
  if (conversationIds.length === 0) return [];

  const lastReadByConversation: Record<string, string | null> = Object.fromEntries(
    (memberships ?? []).map((m) => [m.conversation_id, m.last_read_at]),
  );

  const [{ data: conversations }, { data: allMembers }, { data: messages }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, type, name, updated_at")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("conversation_members")
      .select("conversation_id, profile_id, profiles(id, full_name)")
      .in("conversation_id", conversationIds),
    supabase
      .from("chat_messages")
      .select("id, conversation_id, body, created_at, sender_id")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),
  ]);

  const membersByConversation: Record<string, Array<{ id: string; full_name: string | null }>> = {};
  for (const row of allMembers ?? []) {
    const list = (membersByConversation[row.conversation_id] ??= []);
    if (row.profile_id !== profileId && row.profiles) {
      list.push({ id: row.profiles.id, full_name: row.profiles.full_name });
    }
  }

  const lastMessageByConversation: Record<
    string,
    { body: string; created_at: string; sender_id: string | null }
  > = {};
  for (const msg of messages ?? []) {
    if (!lastMessageByConversation[msg.conversation_id]) {
      lastMessageByConversation[msg.conversation_id] = msg;
    }
  }

  return (conversations ?? []).map((c) => {
    const lastMessage = lastMessageByConversation[c.id] ?? null;
    const lastReadAt = lastReadByConversation[c.id];
    const unread = Boolean(
      lastMessage &&
        lastMessage.sender_id !== profileId &&
        (!lastReadAt || new Date(lastMessage.created_at) > new Date(lastReadAt)),
    );
    return {
      id: c.id,
      type: c.type as "direct" | "group",
      name: c.name,
      updatedAt: c.updated_at,
      otherMembers: membersByConversation[c.id] ?? [],
      lastMessage,
      unread,
    };
  });
}
