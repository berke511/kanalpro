// Kleine, reine Hilfsfunktion(en) rund um Konversationen, die sowohl von
// Server-Komponenten/Actions (über src/lib/messaging.ts, "server-only")
// als auch von Client-Komponenten (z. B. ConversationListPane, die aktive
// Konversation clientseitig hervorheben/filtern muss) gebraucht werden.
// Bewusst in einer eigenen Datei OHNE "server-only", damit sie in beiden
// Welten importierbar bleibt.

/** Anzeigename einer Konversation: Gruppenname, sonst Namen der übrigen Mitglieder. */
export function conversationDisplayName(conversation: {
  type: "direct" | "group";
  name: string | null;
  otherMembers: Array<{ id: string; full_name: string | null }>;
}): string {
  if (conversation.type === "group") {
    return conversation.name?.trim() || "Gruppenchat";
  }
  const other = conversation.otherMembers[0];
  return other?.full_name?.trim() || "Unbekannter Mitarbeiter";
}
