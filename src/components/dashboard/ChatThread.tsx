"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  Check,
  CheckCheck,
  Pencil,
  Reply,
  Send,
  Smile,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteMessage,
  editMessage,
  markConversationRead,
  sendMessage,
  toggleReaction,
  type SentMessage,
} from "@/app/(dashboard)/nachrichten/actions";

const TIME_ZONE = "Europe/Berlin";
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const TYPING_IDLE_MS = 2500;

export type ChatMessageVM = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string | null;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  pending?: boolean;
};

export type ChatMemberVM = {
  id: string;
  full_name: string | null;
  last_read_at: string | null;
};

export type ChatReactionVM = {
  id: string;
  message_id: string;
  profile_id: string;
  emoji: string;
};

function formatMessageTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
}

function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(iso));
}

function formatDaySeparator(iso: string) {
  const key = dayKey(iso);
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(yesterday);
  if (key === todayKey) return "Heute";
  if (key === yesterdayKey) return "Gestern";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric", timeZone: TIME_ZONE });
}

function upsertMessage(prev: ChatMessageVM[], incoming: ChatMessageVM): ChatMessageVM[] {
  const idx = prev.findIndex((m) => m.id === incoming.id);
  if (idx !== -1) {
    const copy = [...prev];
    copy[idx] = { ...copy[idx], ...incoming, pending: false };
    return copy;
  }
  const tempIdx = prev.findIndex(
    (m) => m.pending && m.sender_id === incoming.sender_id && m.body === incoming.body && m.id !== incoming.id,
  );
  const next = [...prev];
  if (tempIdx !== -1) {
    next[tempIdx] = { ...incoming, pending: false };
  } else {
    next.push(incoming);
  }
  return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Der eigentliche Chat-Verlauf + Eingabefeld einer Konversation. Bewusst
 * als Client-Komponente, damit Nachrichten sofort ankommen (Supabase
 * Realtime statt Neuladen alle 4 Sekunden), Senden ohne Seiten-Reload
 * funktioniert und Antworten/Bearbeiten/Löschen/Reaktionen/Lesestatus/
 * Tippt-Indikator/Online-Status möglich sind – das Alleinstellungsmerkmal
 * gegenüber einem einfachen Formular-Chat.
 */
export function ChatThread({
  conversationId,
  currentProfileId,
  isGroup,
  members,
  initialMessages,
  initialReactions,
}: {
  conversationId: string;
  currentProfileId: string;
  isGroup: boolean;
  members: ChatMemberVM[];
  initialMessages: ChatMessageVM[];
  initialReactions: ChatReactionVM[];
}) {
  const [messages, setMessages] = useState<ChatMessageVM[]>(initialMessages);
  const [reactions, setReactions] = useState<ChatReactionVM[]>(initialReactions);
  const [lastReadByMember, setLastReadByMember] = useState<Record<string, string | null>>(
    Object.fromEntries(members.map((m) => [m.id, m.last_read_at])),
  );
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [typingIds, setTypingIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageVM | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const tempIdCounterRef = useRef(0);

  function nextTempId(prefix: string) {
    tempIdCounterRef.current += 1;
    return `${prefix}-${tempIdCounterRef.current}`;
  }

  const nameById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.full_name || "Unbekannt"])), [members]);
  const messageById = useMemo(() => Object.fromEntries(messages.map((m) => [m.id, m])), [messages]);
  const reactionsByMessage = useMemo(() => {
    const map: Record<string, ChatReactionVM[]> = {};
    for (const r of reactions) {
      (map[r.message_id] ??= []).push(r);
    }
    return map;
  }, [reactions]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    scrollToBottom("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length, scrollToBottom]);

  // Realtime: neue/aktualisierte Nachrichten, Reaktionen und Lesestatus
  // sofort empfangen, außerdem Online-/Tippt-Status per Presence.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${conversationId}`, { config: { presence: { key: currentProfileId } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const row = payload.new as ChatMessageVM;
          setMessages((prev) => upsertMessage(prev, row));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const row = payload.new as ChatMessageVM;
          setMessages((prev) => upsertMessage(prev, row));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_message_reactions", filter: `conversation_id=eq.${conversationId}` },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const row = payload.new as ChatReactionVM;
          setReactions((prev) => {
            if (prev.some((r) => r.id === row.id)) return prev;
            // Ersetzt eine eigene optimistisch angelegte Reaktion (temp-id),
            // statt sie doppelt zu zählen, sobald das Realtime-Event dazu
            // eintrifft (auch für den eigenen Client, der sie ausgelöst hat).
            const tempIdx = prev.findIndex(
              (r) => r.id.startsWith("temp-reaction") && r.message_id === row.message_id && r.profile_id === row.profile_id && r.emoji === row.emoji,
            );
            if (tempIdx !== -1) {
              const copy = [...prev];
              copy[tempIdx] = row;
              return copy;
            }
            return [...prev, row];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_message_reactions", filter: `conversation_id=eq.${conversationId}` },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const row = payload.old as { id: string };
          setReactions((prev) => prev.filter((r) => r.id !== row.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversationId}` },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const row = payload.new as { profile_id: string; last_read_at: string | null };
          setLastReadByMember((prev) => ({ ...prev, [row.profile_id]: row.last_read_at }));
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ typing?: boolean }>();
        const online = new Set<string>();
        const typing = new Set<string>();
        for (const [key, metas] of Object.entries(state)) {
          online.add(key);
          if (metas.some((meta) => meta.typing)) typing.add(key);
        }
        setOnlineIds(online);
        setTypingIds(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, currentProfileId]);

  // Beim Öffnen als gelesen markieren (zusätzlich zur serverseitigen
  // Markierung beim initialen Laden – deckt Fälle ab, in denen man schon
  // auf der Seite ist und neue Nachrichten eintrudeln).
  useEffect(() => {
    markConversationRead(conversationId).catch(() => {});
  }, [conversationId, messages.length]);

  const setTyping = useCallback((typing: boolean) => {
    channelRef.current?.track({ typing, online_at: new Date().toISOString() });
  }, []);

  function handleDraftChange(value: string) {
    setDraft(value);
    setTyping(value.trim().length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), TYPING_IDLE_MS);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setError(null);
    setSending(true);
    setTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const tempId = nextTempId("temp");
    const optimistic: ChatMessageVM = {
      id: tempId,
      body,
      created_at: new Date().toISOString(),
      sender_id: currentProfileId,
      reply_to_id: replyTo?.id ?? null,
      edited_at: null,
      deleted_at: null,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    const replyToId = replyTo?.id ?? null;
    setReplyTo(null);

    try {
      const saved: SentMessage = await sendMessage({ conversationId, body, replyToId });
      setMessages((prev) => upsertMessage(prev.filter((m) => m.id !== tempId), { ...saved, reply_to_id: saved.reply_to_id ?? replyToId }));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError("Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.");
    } finally {
      setSending(false);
    }
  }

  async function handleReact(messageId: string, emoji: string) {
    const already = reactionsByMessage[messageId]?.some((r) => r.profile_id === currentProfileId && r.emoji === emoji);
    const tempId = nextTempId("temp-reaction");
    if (already) {
      setReactions((prev) => prev.filter((r) => !(r.message_id === messageId && r.profile_id === currentProfileId && r.emoji === emoji)));
    } else {
      setReactions((prev) => [...prev, { id: tempId, message_id: messageId, profile_id: currentProfileId, emoji }]);
    }
    try {
      await toggleReaction({ messageId, conversationId, emoji });
    } catch {
      // Fehlgeschlagen: optimistische Änderung zurückrollen, statt einen
      // dauerhaft falschen Stand anzuzeigen.
      if (already) {
        setReactions((prev) => [...prev, { id: tempId, message_id: messageId, profile_id: currentProfileId, emoji }]);
      } else {
        setReactions((prev) => prev.filter((r) => r.id !== tempId));
      }
      setError("Reaktion konnte nicht gespeichert werden.");
    }
  }

  function startEdit(message: ChatMessageVM) {
    setEditingId(message.id);
    setEditDraft(message.body);
  }

  async function handleSaveEdit(messageId: string) {
    const body = editDraft.trim();
    if (!body) return;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body, edited_at: new Date().toISOString() } : m)));
    setEditingId(null);
    try {
      await editMessage({ messageId, conversationId, body });
    } catch {
      setError("Änderung konnte nicht gespeichert werden.");
    }
  }

  async function handleDelete(messageId: string) {
    if (!window.confirm("Nachricht wirklich löschen?")) return;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, deleted_at: new Date().toISOString(), body: "" } : m)));
    try {
      await deleteMessage({ messageId, conversationId });
    } catch {
      setError("Nachricht konnte nicht gelöscht werden.");
    }
  }

  const lastMessage = messages[messages.length - 1];
  const lastIsMine = Boolean(lastMessage && lastMessage.sender_id === currentProfileId && !lastMessage.pending);
  const readByOthers = lastIsMine
    ? members.filter((m) => {
        if (m.id === currentProfileId) return false;
        const readAt = lastReadByMember[m.id];
        return readAt && new Date(readAt) >= new Date(lastMessage.created_at);
      })
    : [];

  const typingOthers = Array.from(typingIds).filter((id) => id !== currentProfileId);
  const otherMemberId = !isGroup ? (members.find((m) => m.id !== currentProfileId)?.id ?? null) : null;
  const otherMemberOnline = otherMemberId ? onlineIds.has(otherMemberId) : false;

  const daySeparatorIds = useMemo(() => {
    const ids = new Set<string>();
    let previousKey = "";
    for (const m of messages) {
      const key = dayKey(m.created_at);
      if (key !== previousKey) {
        ids.add(m.id);
        previousKey = key;
      }
    }
    return ids;
  }, [messages]);

  return (
    <>
      <div ref={listRef} className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-sm">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">Noch keine Nachrichten – schreib die erste!</p>
        )}
        {messages.map((m) => {
          const isMe = m.sender_id === currentProfileId;
          const showDaySeparator = daySeparatorIds.has(m.id);
          const replyTarget = m.reply_to_id ? messageById[m.reply_to_id] : null;
          const msgReactions = reactionsByMessage[m.id] ?? [];
          const reactionGroups = REACTION_EMOJIS.map((emoji) => ({
            emoji,
            count: msgReactions.filter((r) => r.emoji === emoji).length,
            mine: msgReactions.some((r) => r.emoji === emoji && r.profile_id === currentProfileId),
          })).filter((g) => g.count > 0);
          const isDeleted = Boolean(m.deleted_at);
          const isEditing = editingId === m.id;

          return (
            <div key={m.id}>
              {showDaySeparator && (
                <div className="my-3 flex items-center justify-center">
                  <span className="rounded-full bg-background px-3 py-1 text-[11px] font-medium text-muted">
                    {formatDaySeparator(m.created_at)}
                  </span>
                </div>
              )}
              <div className={`group flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[80%] items-end gap-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                      isDeleted
                        ? "border border-dashed border-border bg-background text-muted italic"
                        : isMe
                          ? "bg-brand text-white"
                          : "border border-border bg-background text-foreground"
                    } ${m.pending ? "opacity-60" : ""}`}
                  >
                    {!isMe && isGroup && !isDeleted && (
                      <p className="mb-0.5 text-xs font-semibold text-brand-dark">
                        {m.sender_id ? nameById[m.sender_id] ?? "Unbekannt" : "Unbekannt"}
                      </p>
                    )}
                    {replyTarget && !isDeleted && (
                      <div
                        className={`mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs ${
                          isMe ? "border-white/50 bg-white/10 text-white/80" : "border-brand bg-brand-soft/50 text-muted"
                        }`}
                      >
                        <p className="font-medium">{replyTarget.sender_id ? nameById[replyTarget.sender_id] ?? "Unbekannt" : "Unbekannt"}</p>
                        <p className="truncate">{replyTarget.deleted_at ? "Nachricht gelöscht" : replyTarget.body}</p>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="min-w-[200px]">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(m.id);
                            }
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          rows={2}
                          autoFocus
                          className="w-full resize-none rounded-lg border border-white/30 bg-white/10 px-2 py-1.5 text-sm text-inherit outline-none placeholder:text-inherit/60"
                        />
                        <div className="mt-1 flex justify-end gap-2 text-xs">
                          <button type="button" onClick={() => setEditingId(null)} className="opacity-80 hover:opacity-100">
                            Abbrechen
                          </button>
                          <button type="button" onClick={() => handleSaveEdit(m.id)} className="font-semibold opacity-90 hover:opacity-100">
                            Speichern
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{isDeleted ? "Nachricht gelöscht" : m.body}</p>
                    )}

                    {!isEditing && (
                      <p className={`mt-1 flex items-center gap-1 text-[11px] ${isMe ? "text-white/70" : "text-muted"}`}>
                        {formatMessageTime(m.created_at)}
                        {m.edited_at && !isDeleted && <span>· bearbeitet</span>}
                        {m.pending && <span>· wird gesendet…</span>}
                      </p>
                    )}
                  </div>

                  {!isDeleted && !isEditing && (
                    <details className="relative shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <summary className="flex h-6 w-6 list-none items-center justify-center rounded-full text-muted hover:bg-background hover:text-foreground [&::-webkit-details-marker]:hidden">
                        <Smile className="h-3.5 w-3.5" />
                      </summary>
                      <div
                        className={`absolute z-10 mt-1 flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-lg ${
                          isMe ? "right-0" : "left-0"
                        }`}
                      >
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReact(m.id, emoji)}
                            className="text-base leading-none hover:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                        <span className="mx-1 h-4 w-px bg-border" />
                        <button
                          type="button"
                          onClick={() => setReplyTo(m)}
                          className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-muted hover:bg-background hover:text-foreground"
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </button>
                        {isMe && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(m)}
                              className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-muted hover:bg-background hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(m.id)}
                              className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>

              {reactionGroups.length > 0 && (
                <div className={`mt-1 flex flex-wrap gap-1 ${isMe ? "justify-end" : "justify-start"}`}>
                  {reactionGroups.map((g) => (
                    <button
                      key={g.emoji}
                      type="button"
                      onClick={() => handleReact(m.id, g.emoji)}
                      className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${
                        g.mine ? "border-brand bg-brand-soft text-brand-dark" : "border-border bg-background text-muted"
                      }`}
                    >
                      <span>{g.emoji}</span>
                      <span>{g.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {lastIsMine && (
          <div className="flex justify-end">
            <p className="flex items-center gap-1 text-[11px] text-muted">
              {readByOthers.length > 0 ? (
                <>
                  <CheckCheck className="h-3 w-3 text-brand" />
                  Gelesen{isGroup ? ` von ${readByOthers.map((m) => m.full_name || "Unbekannt").join(", ")}` : ""}
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  Gesendet
                </>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="mt-1.5 flex h-4 items-center gap-1 text-xs text-muted">
        {typingOthers.length > 0 ? (
          `${typingOthers.map((id) => nameById[id] ?? "Jemand").join(", ")} ${typingOthers.length === 1 ? "tippt" : "tippen"} …`
        ) : !isGroup && otherMemberOnline ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Online
          </>
        ) : null}
      </div>

      {error && <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {replyTo && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              Antwort an {replyTo.sender_id ? nameById[replyTo.sender_id] ?? "Unbekannt" : "Unbekannt"}
            </p>
            <p className="truncate text-muted">{replyTo.deleted_at ? "Nachricht gelöscht" : replyTo.body}</p>
          </div>
          <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 text-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="mt-2 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          rows={1}
          placeholder="Nachricht schreiben…"
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand sm:text-sm"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Senden</span>
        </button>
      </form>
    </>
  );
}
