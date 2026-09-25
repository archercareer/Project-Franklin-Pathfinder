import { supabase } from "./supabaseClient";

export type ClassifiedProcess = {
  phase: number;
  process: number;
  phase_name: string;
  process_name: string;
};

export type AskSource = {
  source: number;
  file: string;
  refs: string[];
  similarity: number;
  preview: string;
};

export type AskResponse = {
  answer: string;
  take_aim_job?: "motivation" | "role_understanding" | "role_requirements" | "transferable_experience" | "meaningful_gaps" | null;
  recommended_gpt?: "job_search_coach" | "networking_coach" | "resume_coach" | "interview_coach" | "explore" | "focus" | "take_aim" | "positioning" | "relationship_readiness" | "build_relationships" | "build_resume" | "build_cover_letter" | "master_interview" | "execute_search" | "negotiate_offer" | "search_wrap_up" | "jtbd_expansion" | null;
  classified?: ClassifiedProcess[];
  framework_refs_used?: string[];
  was_filtered?: boolean;
  /** True when a follow-up bypassed the out-of-scope refusal and answered without a framework filter. */
  scope_fallback?: boolean;
  sources?: AskSource[];
  worksheets?: string[];
  search_errors?: string[];
};

export type AskHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

/** How many prior messages travel with each question. Three exchanges. */
export const ASK_HISTORY_LIMIT = 6;

export const FRIENDLY_ASK_ERROR_MESSAGE =
  "Sorry — I couldn't reach the backend right now. Please try again.";

export class AskError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(FRIENDLY_ASK_ERROR_MESSAGE);
    this.name = "AskError";
    this.detail = detail;
  }
}

function formatSupabaseFunctionError(error: unknown): string {
  if (!(error && typeof error === "object")) {
    return String(error);
  }

  const anyErr = error as {
    name?: string;
    message?: string;
    context?: { status?: number; statusText?: string; body?: unknown };
  };

  const name = anyErr.name ? `[${anyErr.name}] ` : "";
  const message = anyErr.message ?? "Request failed";
  const status =
    typeof anyErr.context?.status === "number" ? ` (HTTP ${anyErr.context.status})` : "";
  const statusText = anyErr.context?.statusText ? ` ${anyErr.context.statusText}` : "";
  const body =
    anyErr.context?.body !== undefined
      ? `\nResponse body: ${
          typeof anyErr.context.body === "string"
            ? anyErr.context.body
            : JSON.stringify(anyErr.context.body, null, 2)
        }`
      : "";

  return `${name}${message}${status}${statusText}${body}`.trim();
}

export async function ask(
  query: string,
  history: AskHistoryMessage[] = [],
): Promise<AskResponse> {
  const { data, error } = await supabase.functions.invoke<AskResponse>("ask", {
    body: { query, history: history.slice(-ASK_HISTORY_LIMIT) },
  });

  if (error) throw new AskError(formatSupabaseFunctionError(error));
  if (!data?.answer) throw new AskError("Edge function returned no answer.");
  return data;
}
