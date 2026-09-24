# Project Franklin — Pathfinder

The student-facing web app for Project Franklin, plus the `ask` Edge Function that answers the questions. Students sign in, ask career-coaching questions, and get answers drawn from the coaching knowledge base.

This repo holds **the frontend and the `ask` Edge Function**. Accounts, data, the document store, and every other Edge Function live in a separate Supabase project. The app itself is a static website that talks to it.

| | |
|---|---|
| **Stack** | React 18 · Vite 6 · TypeScript · Tailwind CSS 4 |
| **Backend** | Supabase project `pzrxktspxxddhdmpwkeq` (auth, database, Edge Functions) |
| **In this repo** | `supabase/functions/ask/` — the answering function, deployed with the Supabase CLI |
| **Hosting** | Firebase Hosting, project `project-franklin-19c2e` |
| **Design source** | [Figma — Archer UX](https://www.figma.com/design/MJtojKgqmnxodW8neWQ7mX/Archer-UX--1-) |
| **Backend docs** | *Project Franklin — Technical Reference (Backend & Operations)* |

---

## What a student sees

**Not signed in** → a landing page with three ways in: create an account, sign in, or continue as a guest.

**Signed in** → the app: the Pathfinder chat. Ask a question, get an answer that types itself out, with links and worksheets clickable inline. Past chats are listed under "Recent" in the sidebar and can be reopened or deleted.

---

## What happens when a student asks a question

1. The app sends the question to a Supabase Edge Function called **`ask`**, along with the last few turns of the current chat so follow-up questions make sense.
2. `ask` figures out which parts of the program the question is about, finds the most relevant passages from the uploaded documents, and writes an answer grounded in them.
3. The answer comes back and is displayed.
4. The app saves the question and the answer to the database, so the chat shows up in the sidebar and can be reopened later.

Steps 1 and 3 are the only server calls involved in answering. Saving (step 4) is done by this app writing directly to the database. There is still no server-side chat memory: the backend keeps nothing between requests, and the app resends the recent turns each time.

Answers take roughly **5–10 seconds**. That is normal, not a bug.

---

## Getting set up

You need **Node.js 18 or newer** and the Supabase project's URL and anon key.

```bash
npm install
```

Use npm — `package-lock.json` is the lockfile that's committed here.

Then create your local settings file:

```bash
cp .env.example .env
```

Open `.env` and fill in both values from Supabase:

- `VITE_SUPABASE_URL` — the Supabase project URL. Just the base URL, do **not** add `/rest/v1`.
- `VITE_SUPABASE_ANON_KEY` — the anon (public) key, from Supabase → Project Settings → API Keys.

The anon key is meant to be used in a browser, so it is not a secret in the usual sense. Even so, `.env` is git-ignored and must stay out of commits. The real secrets (Anthropic key, Voyage key, service role key) live in Supabase (Dashboard -> Edge Functions -> Secrets) and never come near this repo.

If either value is missing, the app throws an error on startup instead of failing. See [src/lib/supabaseClient.ts](src/lib/supabaseClient.ts).

**Turn on the safety hook** (one time, per clone). This repo ships a pre-commit hook that refuses to commit `.env` files, but git ignores hooks until you point it at them:

```bash
git config core.hooksPath .githooks
```

---

## Running it

```bash
npm run dev      # local dev server with hot reload
npm run build    # production build, written to dist/
```

There are no test or lint scripts in this repo.

---

## Deploying

There are two separate deploys. They are independent: shipping the site does not ship the
function, and vice versa.

### The site

A static build served by Firebase Hosting. `firebase.json` serves the `dist/` folder;
`.firebaserc` pins the Firebase project to `project-franklin-19c2e`.

```bash
npm run build
firebase deploy
```

You need to be a member of the Firebase project to deploy. Hosting serves files only. All accounts, data, and AI work stay on Supabase, so a deploy never touches student data.

### The `ask` function

```bash
supabase functions deploy ask
```

Install the CLI first if you don't have it (`npm install -g supabase`). The command uploads
`supabase/functions/ask/index.ts` from your working tree, **not** from the last commit, so
commit before you deploy or the two will drift.

---

## The `ask` function: this repo is the source of truth

`supabase/functions/ask/index.ts` can be edited in two places: here, or directly in the
Supabase dashboard. They do not sync. Whichever deploys last overwrites the other,
with no warning and no merge.

**Edit it here. Do not edit it in the dashboard.**

If you think the deployed version might be ahead of the repo, check before you deploy —
Dashboard → Edge Functions → `ask` — and copy anything newer into the repo first. The version
header at the top of `index.ts` is the quickest way to tell; bump it whenever you change the
file, and say what changed.

The real secrets the function uses (`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) live in Supabase → Edge Functions → Secrets and never come near
this repo. `CLASSIFY_MODEL` and `ANSWER_MODEL` are set the same way, and both fall back to the
`DEFAULT_MODEL` constant in the file if unset.

---

## What the backend gives this app

This app depends on four things in Supabase. If any of them change, this app has to change with them.

### 1. The `ask` Edge Function

The only Edge Function this app calls. Called through the Supabase client
([src/lib/ask.ts](src/lib/ask.ts)).

**Sent:**

```json
{
  "query": "How do I write a strong cover letter?",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
}
```

`history` is the last 6 messages of the current chat (`ASK_HISTORY_LIMIT` in
[src/lib/ask.ts](src/lib/ask.ts)), oldest first, with failed sends left out. It is optional —
the backend works without it and treats anything malformed as absent. The backend caps it again
on its own side and passes it to both the classifier and the answer, so a follow-up like "what
about the second one?" is classified against what it refers back to rather than read as a
standalone question.

**Returned:**

| Field | What it holds |
|---|---|
| `answer` | The answer text. (Required) The app treats a response without it as an error. |
| `classified` | Which phases and processes the question was matched to, with their names. |
| `framework_refs_used` | The `phase.process` references used to search, e.g. `["4.7"]`. |
| `was_filtered` | `false` means no passage matched the references, so the backend fell back to a plain similarity search. |
| `sources` | The passages behind the answer like file name, references, similarity score, and a preview. |
| `worksheets` | Worksheet links. Declared in our types but not currently displayed on its own; worksheet links reach students inside the answer text. |
| `search_errors` | Web search failures for this answer, as error codes. Empty until web search is switched on. A non-empty list means the answer was written without a lookup that was attempted. |

The app renders `answer` and stores the rest alongside the message, so a reopened chat
looks exactly as it did the first time.

If the call fails, the app appends the failure to the chat as an assistant message — the real
error text when the backend returned one, a plain-language apology otherwise — and does
**not** save the exchange. There is no separate error banner.

### 2. Authentication

Handled entirely by Supabase Auth and the client library. No Edge Function is involved
([src/lib/AuthProvider.tsx](src/lib/AuthProvider.tsx)).

- **Sign up** — email and password, with the student's full name saved as user metadata.
- **Sign in** — email and password. If the Supabase project requires email confirmation,
  the app tells the student to check their inbox.
- **Guest** — anonymous sign-in. A guest gets a real session flagged `is_anonymous`, so
  guests save and reopen chats just like anyone else.

For the Supabase project this means: **email/password sign-up must be enabled, and
anonymous sign-in must be enabled**, or guest mode breaks.

### 3. Two database tables

Written directly by this app ([src/lib/conversations.ts](src/lib/conversations.ts)).

**`conversations`** — `id` · `user_id` · `title` · `created_at` · `updated_at`.
The title is taken from the first question, cut to 60 characters. `updated_at` is bumped
after every exchange so the sidebar can sort newest-first. Conversations with no messages
are cleaned up when opened.

**`messages`** — `id` · `conversation_id` · `role` (`user` or `assistant`) · `content` ·
`metadata` · `created_at`. Assistant rows carry the `ask` response details in `metadata`.

**Row-level security is what keeps students apart.** Both tables have select, insert,
update, and delete policies scoped to `auth.uid()`, and `messages` checks ownership by
joining up to its parent conversation. A student can only ever read or write their own
threads, and this is enforced by the database, not by this app. If RLS were ever turned
off, this app has nothing in it that would stop one student from reading another's chats.

### 4. How the search actually finds things (background)

Useful to know when an answer looks off, though none of it runs in this app.

Every passage of every uploaded document is tagged with `phase.process` references: 
two numbers, like `4.7` for *Draft Cover Letters*. Questions get tagged the same way, up
to three references each. A passage is eligible only if it shares a reference with the
question. Matching is on the full `phase.process`, never the phase alone. Eligible
passages are then ranked by similarity and the top five are used to write the answer.

Those references come from a live Google Sheet, which each backend function re-reads every
10 minutes. So a Sheet edit affects new answers within about 10 minutes, with no deploy but existing passages keep the tags they were given at upload time.

Two things this app never touches: the `document_chunks` table (locked to the service role)
and the ingestion and classification functions (`auto-ingest`, `batch-ingest`,
`classify-chunk`, `classify-failed`).

---

## Project structure

```
├── index.html                    # Page shell and title
├── firebase.json / .firebaserc   # Firebase Hosting config + project pin
├── vite.config.ts                # Vite, Tailwind, "@" → src alias, Figma asset resolver
├── .env.example                  # Template for your local .env
├── .githooks/pre-commit          # Blocks committing .env files
├── supabase/
│   └── functions/ask/index.ts    # The answering function. Source of truth, see Deploying
└── src/
    ├── main.tsx                  # Entry point; wraps the app in AuthProvider
    ├── app/
    │   ├── App.tsx               # Sidebar, sign-in gate, chat shell
    │   └── components/
    │       ├── LandingPage.tsx   # Sign in / sign up / guest
    │       ├── PathfinderChat.tsx  # The chat: input, typing effect, saving
    │       └── FormattedAnswer.tsx # Turns answer text into headings, lists, links
    ├── lib/
    │   ├── supabaseClient.ts     # Creates the Supabase client from .env
    │   ├── AuthProvider.tsx      # Session state and sign-in/out functions
    │   ├── ask.ts                # Calls the ask function; response types
    │   └── conversations.ts      # Saving, listing, loading, deleting chats
    └── styles/                   # Tailwind, fonts, theme
```

---

## When something goes wrong

| What you see | What it usually means |
|---|---|
| App won't start, error about missing env vars | `.env` is missing or a value is blank. Copy `.env.example` and fill both in. |
| Every question fails with a 401 | The anon key in `.env` doesn't match the Supabase project. This happens if the project's JWT secret was rolled. Get the current key from Project Settings → API Keys. |
| An error appears in the chat instead of an answer | The `ask` function is down, erroring, or the URL is wrong. The message carries the real error text. |
| A change to `ask` had no effect | Either it wasn't deployed (`supabase functions deploy ask`), or the dashboard copy is ahead of the repo and overwrote it. Check the version header in `index.ts` against the dashboard. |
| Answers return a 503 | The backend's framework check failed, meaning the Google Sheet is in a broken state. This is a backend/Sheet problem, not a frontend one. |
| Answers take 5–10 seconds | Normal. Classifying, embedding, searching, and writing all happen per question. |
| Answer says it can't help | The question didn't match anything in the framework, or was judged out of scope. Expected behaviour, not a failure. |
| Guest button errors | Anonymous sign-in is turned off in Supabase Auth settings. |
| Sidebar is empty after signing in | Only chats with at least one message are listed. A fresh account genuinely has none. |
| A newly uploaded document isn't reflected in answers | Backend side. Check that the file was processed and its passages were tagged. |

---
