import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LogOut, Send, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { conversationDisplayName } from "@/lib/messaging";
import { formatDateTime } from "@/lib/date";
import { ChatAutoRefresh } from "@/components/dashboard/ChatAutoRefresh";
import { addConversationMember, leaveConversation, sendMessage } from "../actions";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
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
    .select("profile_id, profiles(id, full_name)")
    .eq("conversation_id", id);

  const members = (memberRows ?? [])
    .map((m) => m.profiles)
    .filter((p): p is { id: string; full_name: string | null } => Boolean(p));

  const isMember = members.some((m) => m.id === profile.id);
  if (!isMember) {
    notFound();
  }

  const otherMembers = members.filter((m) => m.id !== profile.id);
  const conversationType = conversation.type as "direct" | "group";
  const name = conversationDisplayName({ type: conversationType, name: conversation.name, otherMembers });

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, body, created_at, sender_id")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const nameById = Object.fromEntries(members.map((m) => [m.id, m.full_name || "Unbekannt"]));

  // Konversation als gelesen markieren, sobald sie geöffnet wird.
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

  const sendWithId = sendMessage.bind(null, id);
  const addMemberWithId = addConversationMember.bind(null, id);
  const leaveWithId = leaveConversation.bind(null, id);

  const orderedMessages = [...(messages ?? [])].reverse();

  return (
    <div className="mx-auto flex h-[calc(100vh-4.5rem)] max-w-3xl flex-col p-4 sm:p-6">
      <ChatAutoRefresh />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/nachrichten" className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Alle Nachrichten
          </Link>
          <h1 className="mt-1 truncate text-lg font-semibold tracking-tight">{name}</h1>
          {conversationType === "group" && (
            <p className="flex items-center gap-1 text-xs text-muted">
              <Users className="h-3.5 w-3.5" />
              {members.length} Mitglieder
            </p>
          )}
        </div>
        {conversationType === "group" && (
          <details className="relative shrink-0">
            <summary className="flex list-none items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-background [&::-webkit-details-marker]:hidden">
              Verwalten
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-border bg-card p-3 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mitglieder</p>
              <ul className="mt-1.5 space-y-1 text-sm">
                {members.map((m) => (
                  <li key={m.id} className="break-words">
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

      {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      {message && <p className="mt-3 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">{message}</p>}

      <div className="mt-4 flex flex-1 flex-col-reverse gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {orderedMessages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">Noch keine Nachrichten – schreib die erste!</p>
        )}
        {orderedMessages.map((m) => {
          const isMe = m.sender_id === profile.id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  isMe ? "bg-brand text-white" : "border border-border bg-background text-foreground"
                }`}
              >
                {!isMe && conversationType === "group" && (
                  <p className="mb-0.5 text-xs font-semibold text-brand-dark">
                    {m.sender_id ? nameById[m.sender_id] ?? "Unbekannt" : "Unbekannt"}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-[11px] ${isMe ? "text-white/70" : "text-muted"}`}>
                  {formatDateTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form action={sendWithId} className="mt-3 flex items-end gap-2">
        <textarea
          name="body"
          rows={1}
          required
          placeholder="Nachricht schreiben…"
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Senden</span>
        </button>
      </form>
    </div>
  );
}
