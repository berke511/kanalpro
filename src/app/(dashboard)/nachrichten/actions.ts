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

export async function sendMessage(conversationId: string, formData: FormData) {
  const { supabase, companyId, profileId } = await requireCompanyContext();
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    redirect(`/nachrichten/${conversationId}`);
  }

  const { error } = await supabase.from("chat_messages").insert({
    conversation_id: conversationId,
    company_id: companyId,
    sender_id: profileId,
    body,
  });

  if (error) {
    redirect(`/nachrichten/${conversationId}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", profileId);

  revalidatePath(`/nachrichten/${conversationId}`);
  revalidatePath("/nachrichten");
  redirect(`/nachrichten/${conversationId}`);
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
