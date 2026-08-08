"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";

async function requireCompanyContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOrCreateProfile(supabase, user);

  if (!profile) {
    redirect("/login?error=Profil+konnte+nicht+geladen+werden");
  }

  return { supabase, companyId: profile.company_id, profileId: profile.id };
}

/**
 * Sucht eine bereits bestehende Direktnachrichten-Konversation zwischen
 * `meId` und `otherId`, damit pro Kollege nur ein Chat-Verlauf entsteht
 * statt bei jedem "Neue Nachricht" ein weiterer Thread.
 */
async function findExistingDirectConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  meId: string,
  otherId: string,
) {
  const { data: myMemberships } = await supabase
    .from("conversation_members")
    .select("conversation_id, conversations!inner(type)")
    .eq("profile_id", meId)
    .eq("conversations.type", "direct");

  const myDirectConversationIds = (myMemberships ?? []).map((m) => m.conversation_id);
  if (myDirectConversationIds.length === 0) return null;

  const { data: sharedMembership } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("profile_id", otherId)
    .in("conversation_id", myDirectConversationIds)
    .limit(1)
    .maybeSingle();

  return sharedMembership?.conversation_id ?? null;
}

export async function createConversation(formData: FormData) {
  const { supabase, companyId, profileId } = await requireCompanyContext();
  const convType = String(formData.get("conv_type") ?? "direct");

  if (convType === "direct") {
    const memberId = String(formData.get("member_id") ?? "").trim();
    if (!memberId || memberId === profileId) {
      redirect("/nachrichten/neu?error=Bitte+einen+Kollegen+auswählen");
    }

    const existingId = await findExistingDirectConversation(supabase, profileId, memberId);
    if (existingId) {
      redirect(`/nachrichten/${existingId}`);
    }

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({ company_id: companyId, type: "direct", created_by: profileId })
      .select("id")
      .single();

    if (error || !conversation) {
      redirect(`/nachrichten/neu?error=${encodeURIComponent(error?.message ?? "Konversation konnte nicht erstellt werden")}`);
    }

    const { error: memberError } = await supabase.from("conversation_members").insert([
      { conversation_id: conversation.id, profile_id: profileId },
      { conversation_id: conversation.id, profile_id: memberId },
    ]);

    if (memberError) {
      redirect(`/nachrichten/neu?error=${encodeURIComponent(memberError.message)}`);
    }

    revalidatePath("/nachrichten");
    redirect(`/nachrichten/${conversation.id}`);
  }

  // Gruppenchat
  const name = String(formData.get("name") ?? "").trim();
  const memberIds = formData
    .getAll("member_ids")
    .map((v) => String(v).trim())
    .filter((v) => v && v !== profileId);
  const uniqueMemberIds = Array.from(new Set(memberIds));

  if (!name) {
    redirect("/nachrichten/neu?error=Bitte+einen+Gruppennamen+angeben");
  }
  if (uniqueMemberIds.length === 0) {
    redirect("/nachrichten/neu?error=Bitte+mindestens+einen+Kollegen+auswählen");
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({ company_id: companyId, type: "group", name, created_by: profileId })
    .select("id")
    .single();

  if (error || !conversation) {
    redirect(`/nachrichten/neu?error=${encodeURIComponent(error?.message ?? "Gruppe konnte nicht erstellt werden")}`);
  }

  const { error: memberError } = await supabase.from("conversation_members").insert([
    { conversation_id: conversation.id, profile_id: profileId },
    ...uniqueMemberIds.map((id) => ({ conversation_id: conversation.id, profile_id: id })),
  ]);

  if (memberError) {
    redirect(`/nachrichten/neu?error=${encodeURIComponent(memberError.message)}`);
  }

  revalidatePath("/nachrichten");
  redirect(`/nachrichten/${conversation.id}`);
}

// Die folgenden Actions werden NICHT mehr über <form action=...> (mit
// redirect()/vollem Seiten-Reload) aufgerufen, sondern direkt als
// asynchrone Funktionen aus der Chat-Oberfläche (ChatThread, Client-
// Komponente) heraus – für sofortiges Senden, Bearbeiten, Löschen und
// Reagieren ohne Neuladen. Sie werfen bei Fehlern eine normale Error
// (statt zu redirecten), die die Client-Komponente selbst behandelt
// (z. B. optimistische Nachricht wieder entfernen).

export type SentMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string | null;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
};

export async function sendMessage(input: {
  conversationId: string;
  body: string;
  replyToId?: string | null;
}): Promise<SentMessage> {
  const { supabase, companyId, profileId } = await requireCompanyContext();
  const body = input.body.trim();

  if (!body) {
    throw new Error("Nachricht darf nicht leer sein");
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: input.conversationId,
      company_id: companyId,
      sender_id: profileId,
      body,
      reply_to_id: input.replyToId ?? null,
    })
    .select("id, body, created_at, sender_id, reply_to_id, edited_at, deleted_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nachricht konnte nicht gesendet werden");
  }

  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", input.conversationId)
    .eq("profile_id", profileId);

  revalidatePath(`/nachrichten/${input.conversationId}`);
  revalidatePath("/nachrichten");

  return data;
}

export async function editMessage(input: { messageId: string; conversationId: string; body: string }) {
  const { supabase, profileId } = await requireCompanyContext();
  const body = input.body.trim();

  if (!body) {
    throw new Error("Nachricht darf nicht leer sein");
  }

  const { error } = await supabase
    .from("chat_messages")
    .update({ body, edited_at: new Date().toISOString() })
    .eq("id", input.messageId)
    .eq("sender_id", profileId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/nachrichten/${input.conversationId}`);
}

export async function deleteMessage(input: { messageId: string; conversationId: string }) {
  const { supabase, profileId } = await requireCompanyContext();

  const { error } = await supabase
    .from("chat_messages")
    .update({ deleted_at: new Date().toISOString(), body: "" })
    .eq("id", input.messageId)
    .eq("sender_id", profileId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/nachrichten/${input.conversationId}`);
}

export async function toggleReaction(input: {
  messageId: string;
  conversationId: string;
  emoji: string;
}): Promise<{ active: boolean }> {
  const { supabase, companyId, profileId } = await requireCompanyContext();

  const { data: existing } = await supabase
    .from("chat_message_reactions")
    .select("id")
    .eq("message_id", input.messageId)
    .eq("profile_id", profileId)
    .eq("emoji", input.emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("chat_message_reactions").delete().eq("id", existing.id);
    return { active: false };
  }

  const { error } = await supabase.from("chat_message_reactions").insert({
    message_id: input.messageId,
    conversation_id: input.conversationId,
    company_id: companyId,
    profile_id: profileId,
    emoji: input.emoji,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { active: true };
}

export async function markConversationRead(conversationId: string) {
  const { supabase, profileId } = await requireCompanyContext();

  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", profileId);
}

export async function addConversationMember(conversationId: string, formData: FormData) {
  const { supabase } = await requireCompanyContext();
  const memberId = String(formData.get("member_id") ?? "").trim();

  if (!memberId) {
    redirect(`/nachrichten/${conversationId}?error=Bitte+einen+Kollegen+auswählen`);
  }

  const { error } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: conversationId, profile_id: memberId });

  if (error) {
    redirect(`/nachrichten/${conversationId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/nachrichten/${conversationId}`);
  redirect(`/nachrichten/${conversationId}?message=Mitglied+hinzugefügt`);
}

export async function leaveConversation(conversationId: string) {
  const { supabase, profileId } = await requireCompanyContext();

  await supabase
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("profile_id", profileId);

  revalidatePath("/nachrichten");
  redirect("/nachrichten?message=Konversation+verlassen");
}
