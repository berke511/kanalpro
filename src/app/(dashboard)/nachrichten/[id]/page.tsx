
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LogOut, MoreVertical, UserPlus, Users } from "lucide-react";
import { getRequestSupabase, getRequestUser, getRequestProfile } from "@/lib/supabase/request";
import { conversationDisplayName } from "@/lib/messaging";
import { ChatThread } from "@/components/dashboard/ChatThread";
import { addConversationMember, leaveConversation } from "../actions";

// Rechte Spalte der geteilten Nachrichten-Ansicht (Liste kommt aus
// layout.tsx und bleibt beim Wechseln zwischen Konversationen stehen –
// daher hier kein "Zurück zu allen Nachrichten"-Link mehr auf dem Desktop,
// nur noch als mobiler Pfeil, weil dort die Liste ausgeblendet wird).
export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;
  const supabase = await getRequestSupabase();
  const user = await getRequestUser();

  if (!user) {
    return null;
  }

  const profile = await getRequestProfile();
  if (!profile) {
    return null;
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, type, name")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) {
    notFound();
  }

  const { data: memberRows } = await supabase
    .from("conversation_members")
    .select("profile_id, last_read_at, profiles(id, full_name)")
    .eq("conversation_id", id);

  const members = (memberRows ?? [])
    .filter((m) => m.profiles)
    .map((m) => ({ id: m.profiles!.id, full_name: m.profiles!.full_name, last_read_at: m.last_read_at as string | null }));

  const isMember = members.some((m) => m.id === profile.id);
  if (!isMember) {
    notFound();
  }

  const otherMembers = members.filter((m) => m.id !== profile.id);
  const conversationType = conversation.type as "direct" | "group";
  const name = conversationDisplayName({ type: conversationType, name: conversation.name, otherMembers });

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, body, created_at, sender_id, reply_to_id, edited_at, deleted_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const messageIds = (messages ?? []).map((m) => m.id);
  const { data: reactionRows } =
    messageIds.length > 0
      ? await supabase
          .from("chat_message_reactions")
          .select("id, message_id, profile_id, emoji")
          .in("message_id", messageIds)
      : { data: [] as Array<{ id: string; message_id: string; profile_id: string; emoji: string }> };

  // Konversation als gelesen markieren, sobald sie geöffnet wird (zusätzlich
  // markiert die Chat-Oberfläche selbst live nach, siehe ChatThread).
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("profile_id", profile.id);

  const { data: otherEmployees } =
    conversationType === "group"
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .neq("id", profile.id)
          .order("full_name", { ascending: true })
      : { data: [] as Array<{ id: string; full_name: string | null }> };

  const addableEmployees = (otherEmployees ?? []).filter((e) => !members.some((m) => m.id === e.id));

  const addMemberWithId = addConversationMember.bind(null, id);
  const leaveWithId = leaveConversation.bind(null, id);

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex h-full flex-col p-4 sm:p-6">
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-4 py-4 text-white shadow-lg shadow-brand/25 sm:px-6">
        <div className="pointer-events-none absolute -right-8 -top-14 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href="/nachrichten" className="shrink-0 text-white/90 hover:text-white sm:hidden" aria-label="Alle Nachrichten">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-sm font-semibold text-white">
              {initial}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight">{name}</h1>
              {conversationType === "group" ? (
                <p className="flex items-center gap-1 text-[11px] text-white/75">
                  <Users className="h-3.5 w-3.5" />
                  {members.length} Mitglieder
                </p>
              ) : (
                <p className="text-[11px] text-white/75">Direktnachricht</p>
              )}
            </div>
          </div>
          {conversationType === "group" && (
            <details className="relative shrink-0">
              <summary className="flex list-none items-center gap-1.5 rounded-[9px] border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 [&::-webkit-details-marker]:hidden">
                <MoreVertical className="h-3.5 w-3.5" />
                Verwalten
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-border bg-card p-3 text-foreground shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mitglieder</p>
                <ul className="mt-1.5 space-y-1.5 text-sm">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 break-words">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand-dark">
                        {(m.full_name || "?").trim().charAt(0).toUpperCase()}
                      </span>
                      {m.full_name || "Unbenannt"}
                      {m.id === profile.id ? " (Du)" : ""}
                    </li>
                  ))}
                </ul>
                {addableEmployees.length > 0 && (
                  <form action={addMemberWithId} className="mt-3 flex items-center gap-1.5">
                    <select
                      name="member_id"
                      required
                      defaultValue=""
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-brand"
                    >
                      <option value="" disabled>
                        Kollege hinzufügen…
                      </option>
                      {addableEmployees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.full_name || "Unbenannt"}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                      aria-label="Mitglied hinzufügen"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </button>
                  </form>
                )}
                <form action={leaveWithId} className="mt-3 border-t border-border pt-3">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Gruppe verlassen
                  </button>
                </form>
              </div>
            </details>
          )}
        </div>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      {message && <p className="mt-3 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">{message}</p>}

      <ChatThread
        conversationId={id}
        currentProfileId={profile.id}
        isGroup={conversationType === "group"}
        members={members}
        initialMessages={messages ?? []}
        initialReactions={reactionRows ?? []}
      />
    </div>
  );
}
