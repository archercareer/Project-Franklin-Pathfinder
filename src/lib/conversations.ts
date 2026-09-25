import { supabase } from "./supabaseClient";
import type { AskResponse } from "./ask";

export type ConversationSummary = {
  id: string;
  title: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AssistantMessageMetadata = {
  take_aim_job?: AskResponse["take_aim_job"];
  recommended_gpt?: AskResponse["recommended_gpt"];
  sources?: AskResponse["sources"];
  classified?: AskResponse["classified"];
  framework_refs_used?: AskResponse["framework_refs_used"];
  was_filtered?: AskResponse["was_filtered"];
};

export function conversationTitleFromQuery(query: string): string {
  const trimmed = query.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.slice(0, 57)}...`;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, updated_at, messages(id)")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => Array.isArray(row.messages) && row.messages.length > 0)
    .map(({ id, title, updated_at }) => ({ id, title, updated_at }));
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
  if (error) throw new Error(error.message);
}

/** Creates a conversation if needed, then saves the Q&A pair. Only call after a successful ask(). */
export async function saveExchange(
  query: string,
  answer: string,
  metadata: AssistantMessageMetadata,
  existingConversationId?: string | null
): Promise<string> {
  let conversationId = existingConversationId ?? null;

  if (!conversationId) {
    const conv = await createConversation(conversationTitleFromQuery(query));
    conversationId = conv.id;
  }

  await appendMessages(conversationId, query, answer, metadata);
  return conversationId;
}

export async function createConversation(title: string): Promise<ConversationSummary> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, title })
    .select("id, title, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ChatMessage[];
}

export async function appendMessages(
  conversationId: string,
  userContent: string,
  assistantContent: string,
  metadata: AssistantMessageMetadata
): Promise<void> {
  const now = new Date().toISOString();

  const { error: messagesError } = await supabase.from("messages").insert([
    { conversation_id: conversationId, role: "user", content: userContent },
    {
      conversation_id: conversationId,
      role: "assistant",
      content: assistantContent,
      metadata,
    },
  ]);

  if (messagesError) throw new Error(messagesError.message);

  const { error: convError } = await supabase
    .from("conversations")
    .update({ updated_at: now })
    .eq("id", conversationId);

  if (convError) throw new Error(convError.message);
}

export function formatConversationDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
