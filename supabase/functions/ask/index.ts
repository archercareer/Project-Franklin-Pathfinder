// Project Franklin — ask (v24)
// v24 (M7): accepts recent conversation turns and passes them to both the classifier and the
//      answer, so follow-ups resolve instead of being read as standalone questions. Plus a
//      backstop: with history present the out-of-scope refusal is never returned, since a
//      follow-up's meaning lives in the turn before it. Fixes the "which gpt?" refusal loop.
// v22: removed Ascent-specific framing (general career-coaching product now); tone/structure
//      pass on the system prompt — match tone to the person, always close with a next step or
//      clarifying question, warm peer voice, explicit honesty when content doesn't cover it.
// v23 (M3-M6): answer length raised and the hard sentence cap dropped; all text blocks are read
//      instead of content[0]; paused turns are resumed; web search tool errors are surfaced
//      instead of being mistaken for success.

import { createClient } from "npm:@supabase/supabase-js@2";

const VOYAGE_API   = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const CLASSIFY_MODEL = Deno.env.get("CLASSIFY_MODEL") ?? DEFAULT_MODEL;
const ANSWER_MODEL   = Deno.env.get("ANSWER_MODEL")   ?? DEFAULT_MODEL;
const TOP_K = 5;
const ANSWER_MAX_TOKENS = 2000;
const MAX_PAUSE_RESUMES = 3;
const HISTORY_LIMIT = 6;
const HISTORY_CHAR_CAP = 4000;

const SHEET_ID = "1e--YxqN7X6vaoObkqgjGBgt5BTzeDyW-9-pCKzjlcps";
const GID = "442416528";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
const ZERO = "0.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
};

// ---------- CSV + framework ----------
function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\r") {}
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
function stripLeadingRef(s: string): string { return (s || "").replace(/^\s*\d+\.\d+(\.\d+)?\s*/, "").trim(); }
function colIndex(header: string[], needle: string): number {
  const n = needle.toLowerCase();
  return header.findIndex((h) => (h ?? "").toLowerCase().includes(n));
}

interface TaskInfo { pain: string; task: string; output: string; links: string[]; }
interface ProcessInfo { phaseNum: number; phaseName: string; procNum: number; procName: string; tasks: TaskInfo[]; }
interface Framework { processes: Map<string, ProcessInfo>; validKeys: Set<string>; }

function buildFramework(csvText: string): Framework {
  const rows = parseCSV(csvText);
  const processes = new Map<string, ProcessInfo>();
  if (rows.length < 2) return { processes, validKeys: new Set() };

  const header = rows[0].map((h) => (h ?? "").trim());
  const iID    = colIndex(header, "id");
  const iPhase = colIndex(header, "phase");
  const iProc  = colIndex(header, "process");
  const iPain  = colIndex(header, "pain");
  const iTask  = colIndex(header, "task");
  const iOut   = colIndex(header, "output");
  const iWork  = colIndex(header, "template");
  if (iID < 0 || iPhase < 0 || iProc < 0) throw new Error(`framework_csv_headers_missing id=${iID} phase=${iPhase} process=${iProc}`);

  const phaseNames = new Map<number, string>();
  let pendingProc: string | null = null;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]; if (!row) continue;
    const id   = (row[iID]   ?? "").trim();
    const ph   = (row[iPhase]?? "").trim();
    const proc = (row[iProc] ?? "").trim();
    const pain = iPain >= 0 ? (row[iPain] ?? "").trim() : "";
    const task = iTask >= 0 ? (row[iTask] ?? "").trim() : "";
    const out  = iOut  >= 0 ? (row[iOut]  ?? "").trim() : "";
    const work = iWork >= 0 ? (row[iWork] ?? "").trim() : "";

    const mPhase = id.match(/^(\d+)$/);
    const mProc  = id.match(/^(\d+)\.(\d+)$/);
    const mTask  = id.match(/^(\d+)\.(\d+)\.(\d+)$/);

    if (mPhase) { if (ph) phaseNames.set(parseInt(mPhase[1]), ph.replace(/^\s*\d+\.?\s*/, "").trim()); pendingProc = null; continue; }
    if (mProc) {
      const key = `${mProc[1]}.${mProc[2]}`;
      if (!processes.has(key)) processes.set(key, { phaseNum: parseInt(mProc[1]), phaseName: "", procNum: parseInt(mProc[2]), procName: proc || pendingProc || "", tasks: [] });
      else if (proc) processes.get(key)!.procName = proc;
      pendingProc = null; continue;
    }
    if (mTask) {
      const key = `${mTask[1]}.${mTask[2]}`;
      if (!processes.has(key)) processes.set(key, { phaseNum: parseInt(mTask[1]), phaseName: "", procNum: parseInt(mTask[2]), procName: "", tasks: [] });
      const p = processes.get(key)!;
      if (proc && !p.procName) p.procName = proc;
      else if (pendingProc && !p.procName) p.procName = pendingProc;
      pendingProc = null;
      const links = work ? work.split(/\s+/).filter((u) => u.startsWith("http")) : [];
      p.tasks.push({ pain: stripLeadingRef(pain), task: stripLeadingRef(task), output: out, links });
      continue;
    }
    if (!id && proc) pendingProc = proc;
  }
  for (const p of processes.values()) p.phaseName = phaseNames.get(p.phaseNum) ?? "";
  return { processes, validKeys: new Set(processes.keys()) };
}

let _cache: { fw: Framework; at: number } | null = null;
const TTL_MS = 10 * 60 * 1000;
async function getFramework(): Promise<Framework> {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.fw;
  const res = await fetch(CSV_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`framework_csv_http_${res.status}`);
  const text = await res.text();
  if (text.slice(0, 200).toLowerCase().includes("<html") || text.slice(0, 200).toLowerCase().includes("<!doctype html"))
    throw new Error("framework_csv_not_public");
  const fw = buildFramework(text);
  if (fw.processes.size < 35 || !fw.validKeys.has("4.7") || fw.processes.get("4.7")!.procName.toLowerCase().indexOf("cover") === -1)
    throw new Error(`framework_csv_shape_invalid_${fw.processes.size}`);
  _cache = { fw, at: Date.now() };
  return fw;
}

function frameworkList(fw: Framework): string {
  const keys = [...fw.validKeys].sort((a, b) => { const [pa, qa] = a.split(".").map(Number), [pb, qb] = b.split(".").map(Number); return pa - pb || qa - qb; });
  const lines: string[] = []; let lastPhase = -1;
  for (const k of keys) { const p = fw.processes.get(k)!;
    if (p.phaseNum !== lastPhase) { lines.push(`Phase ${p.phaseNum}. ${p.phaseName}`); lastPhase = p.phaseNum; }
    lines.push(`  ${k} ${p.procName}`); }
  return lines.join("\n");
}

// ---------- conversation history ----------
// The client sends recent turns so follow-ups resolve ("what about the second one?").
// Treat them as untrusted input: cap the count and the size, keep only well-formed turns,
// and never let the array open on an assistant turn — the API rejects that.
interface Turn { role: "user" | "assistant"; content: string; }

function sanitizeHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  const clean = raw
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant")
      && typeof m.content === "string" && m.content.trim().length > 0)
    .slice(-HISTORY_LIMIT)
    .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, HISTORY_CHAR_CAP) }));
  while (clean.length && clean[0].role === "assistant") clean.shift();
  return clean;
}

// ---------- query classification ----------
interface Pair { phase: number; process: number; }
async function classifyQuery(query: string, fw: Framework, key: string, history: Turn[] = []): Promise<{ pairs: Pair[]; zero: boolean; invalid: boolean }> {
  const sys = `You classify a person's career-coaching question against a fixed framework.

FRAMEWORK (phase.process):
${frameworkList(fw)}

Earlier turns of the conversation may be included before the question. Classify the LAST user message only; use the earlier turns solely to work out what it refers to. A short follow-up like "what about the second one?" is in scope whenever the turn it refers back to was.
Return the 1 to 3 MOST relevant reference points in "phase.process" format (two numbers).
If the question has NO genuine connection to any process (e.g. weather, sports, unrelated chit-chat), return exactly ["0.0"].
Return STRICT JSON only, no prose, no fences: {"refs":["p.p", ...]}`;

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: CLASSIFY_MODEL, max_tokens: 80,
      system: [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }],
      messages: [...history, { role: "user", content: query }] }),
  });
  if (!res.ok) return { pairs: [], zero: false, invalid: true };
  const data = await res.json();
  const raw = (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  let parsed: { refs?: string[] };
  try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return { pairs: [], zero: false, invalid: true }; }
  const refs = [...new Set((parsed.refs ?? []).map((r) => String(r).trim()))].slice(0, 3);
  if (refs.length === 0) return { pairs: [], zero: false, invalid: true };
  if (refs.includes(ZERO)) return { pairs: [], zero: true, invalid: false };
  const valid = refs.filter((r) => fw.validKeys.has(r));
  if (valid.length === 0) return { pairs: [], zero: false, invalid: true };
  const pairs = valid.map((r) => { const [p, q] = r.split(".").map(Number); return { phase: p, process: q }; });
  return { pairs, zero: false, invalid: false };
}

// ---------- answer blocks ----------
// Responses can carry more than one block once web search is on (server_tool_use,
// web_search_tool_result, text). Never index content[0].
function textFromBlocks(blocks: any[]): string {
  return (blocks ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
}

// Search failures come back as HTTP 200: a web_search_tool_result whose content is an error
// object instead of an array of results. Collect them so we never answer as if search worked.
function searchErrors(blocks: any[]): string[] {
  return (blocks ?? [])
    .filter((b: any) => b.type === "web_search_tool_result")
    .map((b: any) => b.content)
    .filter((c: any) => c && !Array.isArray(c))
    .map((c: any) => String(c.error_code ?? "unknown"));
}

function jsonResp(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  let query: string, pretty = false, history: Turn[] = [];
  try {
    const b = await req.json();
    query = b.query?.trim(); pretty = b.pretty === true; history = sanitizeHistory(b.history);
    if (!query) throw new Error("Missing query");
  }
  catch (e) { return jsonResp({ error: String(e) }, 400); }

  const voyageKey = Deno.env.get("VOYAGE_API_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let fw: Framework;
  try { fw = await getFramework(); }
  catch (_e) {
    return jsonResp({ answer: "I can't reach the coaching framework right now. Please try again in a moment.", error: "framework_unavailable" }, 503);
  }

  const [embedRes, cls] = await Promise.all([
    fetch(VOYAGE_API, { method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${voyageKey}` },
      body: JSON.stringify({ model: VOYAGE_MODEL, input: query, input_type: "query" }) }),
    classifyQuery(query, fw, anthropicKey, history),
  ]);

  // A short follow-up inside a live conversation ("which gpt?", "why?") carries no career
  // content of its own, so the classifier scores it unrelated and we used to refuse — three
  // times in a row, identically, while the person was asking about something we had just
  // raised. The meaning lives in the previous turn. So: when there is history, never hard
  // refuse. Drop the framework filter and let the similarity fallback answer instead.
  // Telling the classifier to use the history is the primary fix; this is the backstop for
  // when it doesn't.
  const isFollowUp = history.length > 0;
  const scopeFallback = (cls.invalid || cls.zero) && isFollowUp;

  if (cls.invalid && !isFollowUp) {
    return jsonResp({ answer: "That one's outside what I can help with — I'm focused on career and job-search coaching. What are you working on? I can dig into search strategy, positioning, networking, resumes and cover letters, or interviews.", classified: [], worksheets: [] });
  }
  if (cls.zero && !isFollowUp) {
    return jsonResp({ answer: "That's outside what I can help with here, but I'm glad to get into career direction, positioning, networking, resumes and cover letters, interviews, or managing your job search day to day — what would be most useful?", classified: [], worksheets: [] });
  }

  if (!embedRes.ok) return jsonResp({ error: `Voyage failed: ${await embedRes.text()}` }, 500);
  const queryEmbedding = (await embedRes.json()).data[0].embedding;

  const pairsJson = cls.pairs.map((p) => ({ phase: p.phase, process: p.process }));
  const { data: chunks, error: rpcErr } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding, match_count: TOP_K, pairs: pairsJson,
  });
  if (rpcErr) return jsonResp({ error: `RPC failed: ${rpcErr.message}` }, 500);

  const rows = (chunks ?? []) as { id: number; content: string; file_name: string; framework_refs: string[]; similarity: number; was_filtered: boolean }[];
  const wasFiltered = rows.length > 0 ? rows[0].was_filtered : true;

  const classified = cls.pairs.map((p) => {
    const info = fw.processes.get(`${p.phase}.${p.process}`)!;
    return { phase: p.phase, process: p.process, phase_name: info.phaseName, process_name: info.procName };
  });

  const taskLinks = new Map<string, string[]>();
  const anyLinksPresent = { v: false };
  const layer1 = cls.pairs.map((p) => {
    const info = fw.processes.get(`${p.phase}.${p.process}`)!;
    const tasks = info.tasks.map((t, i) => {
      const taskId = `${p.phase}.${p.process}.${i + 1}`;
      if (t.links.length) { taskLinks.set(taskId, t.links); anyLinksPresent.v = true; }
      const linkStr = t.links.length ? `\n        Worksheet: ${t.links.join(" , ")}` : "";
      return `   ${taskId}  Pain point: ${t.pain || "—"}\n        Task: ${t.task || "—"}\n        Expected output: ${t.output || "—"}${linkStr}`;
    }).join("\n");
    return `Phase ${p.phase} (${info.phaseName}) → Process ${p.process} (${info.procName}):\n${tasks}`;
  }).join("\n\n");

  const layer2 = rows.map((c, i) => `[Source ${i + 1}]\n${c.content}`).join("\n\n---\n\n");

  const fallbackNote = wasFiltered ? "" :
    "\n\nOne more thing: nothing matched this exact process, so the sources below are the closest general fit — use them, but don't imply they're an exact match."

  const taskNote = anyLinksPresent.v
    ? "\n- You'll see framework tasks tagged like 4.7.1, each with a description and, for some, a worksheet link. - Pick the ONE task that best fits what the person is actually asking. - Close your answer with a clear, specific next step written in your own words — describe what they should actually go do, don't just say \"work on this worksheet.\" - If that task has a worksheet, add it as a real markdown link so it renders as something clickable, not a raw URL — e.g. \"Your next step: <describe the task specifically>. Here's the worksheet to help: [Open the worksheet](<link>).\" If there's no worksheet, just state the next step on its own. - On the very last line, output a tag naming that task exactly as [[task:P.Q.N]] (e.g. [[task:4.7.1]]), or [[task:none]] if nothing genuinely matches. Nothing should follow this tag."
    : "";

  const systemPrompt = `You are Pathfinder, a career-coaching assistant. You help people navigate their careers — direction and positioning, networking, resumes and cover letters, interviews, and running a job search day to day.

You're given three layers: (1) a coaching framework for the area(s) this question touches — pain points, tasks, expected outputs, and worksheet links where they exist; (2) a few relevant excerpts from the available coaching materials; (3) the person's actual question.

How to respond:
- Read where the person is and meet them there. Match your tone to their situation instead of using one register for everyone:
  - Just got good news (an interview, a callback, a referral) → match their energy, help them act on the momentum quickly. Don't just say "congrats," get straight to the useful next move.
  - Just got a rejection or a setback → briefly acknowledge it, then redirect to something concrete. Don't dwell or over-console.
  - Deciding between competing options → give them a repeatable way to think it through, not just your opinion.
  - Overconfident, or there's a real gap or weak spot in their plan → say so plainly and directly. You're allowed to disagree and push back, not just validate. Being honest about a real problem is more useful than being encouraging about it.
  - Seems stuck or hasn't taken any action → a gentle, direct nudge toward one small next step. Not a lecture.
  - Still figuring out direction, early in a question → prioritize understanding their actual situation before advising. Don't jump straight to a solution.
  - Anxious or overwhelmed → steady them, then give one concrete move.
  - Just wants a fact → give a crisp, direct answer, skip the coaching framing.
  - Clearly deep in the work already → match their level, skip the basics.
- Sound like a sharp peer who has done this before — warm, direct, human. Not a brochure, not a lecture. No pep-talk clichés, no "as an AI", no throat-clearing, no restating the question.
- Give the answer the room it needs, and no more. Most replies land in two or three short paragraphs, or a short bulleted list when that is genuinely clearer. Don't pad, and don't cut a useful thought short to hit a length.
- Never use em dashes. If a sentence seems to need one, rewrite it instead, use a period, comma, or "and"/"but" to connect the thought.
- Stay inside what you were given. If the framework and excerpts don't really cover what they're asking, say so plainly instead of filling the gap with a guess — then point them to the closest thing that would actually help.
- Never end on a bare statement of information. Close every reply with either a clear next step — something specific they can go do, in your own words — or a genuine clarifying question when you can't give a useful answer without knowing more.${taskNote}${fallbackNote}`;

  const layer1Text = layer1 ||
    "(none — this is a follow-up to the conversation above. Work out what it refers to from the earlier turns, and answer from those plus the excerpts below. Do not tell the person their question is out of scope.)";

  const userPrompt = `LAYER 1 — Coaching framework context:\n${layer1Text}\n\n---\n\nLAYER 2 — Retrieved program excerpts:\n${layer2 || "(none)"}\n\n---\n\nLAYER 3 — Person's question:\n${query}`;

  // Web search can pause a turn partway through; resume by handing the paused content back
  // and letting the model continue. Bounded so a pause loop can't run away.
  const genMessages: any[] = [...history, { role: "user", content: userPrompt }];
  const answerBlocks: any[] = [];
  const searchFailures: string[] = [];

  for (let resumes = 0; ; resumes++) {
    const genRes = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: ANSWER_MODEL, max_tokens: ANSWER_MAX_TOKENS, system: systemPrompt, messages: genMessages }),
    });
    if (!genRes.ok) return jsonResp({ error: `Claude failed: ${await genRes.text()}` }, 500);
    const genData = await genRes.json();
    answerBlocks.push(...(genData.content ?? []));
    searchFailures.push(...searchErrors(genData.content));
    if (genData.stop_reason !== "pause_turn" || resumes >= MAX_PAUSE_RESUMES) break;
    genMessages.push({ role: "assistant", content: genData.content });
  }

  let answer = textFromBlocks(answerBlocks);
  if (!answer.trim()) {
    return jsonResp({ error: "empty_answer", search_errors: searchFailures }, 502);
  }

  let selectedTask: string | null = null;
  let worksheets: string[] = [];
  const tagMatch = answer.match(/\[\[task:\s*([0-9]+\.[0-9]+\.[0-9]+|none)\s*\]\]/i);
  if (tagMatch) {
    answer = answer.replace(/\s*\[\[task:[^\]]*\]\]\s*$/i, "").trimEnd();
    const picked = tagMatch[1].toLowerCase();
    if (picked !== "none") { selectedTask = picked; worksheets = taskLinks.get(picked) ?? []; }
  }

  const refsUsed = [...new Set(rows.flatMap((r) => r.framework_refs ?? []))];
  const sources = rows.map((c, i) => ({ source: i + 1, file: c.file_name, refs: c.framework_refs,
    similarity: Math.round(c.similarity * 1000) / 1000, preview: c.content.slice(0, 120) + "..." }));

  if (pretty) {
    const d = "─".repeat(60);
    const cl = classified.map((c) => `${c.phase}.${c.process} ${c.phase_name} → ${c.process_name}`).join("; ");
    const srcs = sources.map((s) => `  [${s.source}] (${s.similarity}) ${s.refs?.join(",")} ${s.preview}`).join("\n");
    const ws = worksheets.length ? worksheets.map((w) => `  ${w}`).join("\n") : "  (none)";
    const se = searchFailures.length ? searchFailures.join(", ") : "(none)";
    return new Response([d, `QUESTION: ${query}`, `CLASSIFIED: ${cl}`, `SELECTED TASK: ${selectedTask ?? "none"}`, `MODELS: classify=${CLASSIFY_MODEL} answer=${ANSWER_MODEL}`, `FILTERED: ${wasFiltered}`, `HISTORY: ${history.length} turn(s)`, `SCOPE FALLBACK: ${scopeFallback}`, `SEARCH ERRORS: ${se}`, d, answer, d, "WORKSHEETS (selected task only)", ws, d, "SOURCES", srcs, d].join("\n"),
      { headers: { ...CORS, "Content-Type": "text/plain" } });
  }
  return jsonResp({ answer, classified, selected_task: selectedTask, framework_refs_used: refsUsed, was_filtered: wasFiltered, scope_fallback: scopeFallback, worksheets, sources, search_errors: searchFailures });
});
