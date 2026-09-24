# Franklin MVP Plan: Take Aim First

## What Franklin is

Franklin is an AI career coach. Today it works like a Q&A chatbot: someone asks a question, it answers using documents it has been given. We are turning it into a coach that remembers where a person is in their job search, knows what they need to work on next, and guides them through it step by step.

We are building on top of an existing app called **Pathfinder**. It already has working logins, a chat screen, and a document search system with real content loaded in. We keep all of that and add to it. We are not starting over.

## What this MVP covers

The full coaching journey has many stages (Explore, Focus, Take Aim, Positioning, Networking, Applications, Interviews, and more). **This MVP builds only one stage: Take Aim.** Other stages come later, one at a time, using the same approach.

Take Aim is for someone who already has a direction in mind and needs to get specific: why they want it, what the role really involves, what it takes to be strong at it, how their background fits, and where their gaps are.

## Key terms

- **JTBD (Job to Be Done):** one specific thing a person is trying to get done, like "explain why I want this role."
- **Agent:** the AI that handles a JTBD.
- **Seeker spec and Coach spec:** every Take Aim JTBD is written twice. The Seeker spec describes what the person wants and what "done" looks like for them. The Coach spec describes how the AI should coach them there (probe vague answers, challenge borrowed or prestige-driven reasons, test against real role requirements). **Each pair is built as one agent**, using the Coach spec as the method and the Seeker spec as the goal and finish line.
- **Orchestrator:** the coordinator. It looks at the person's profile and decides which JTBD to work on right now.
- **Job Search State:** the saved profile Franklin keeps for each person, so it doesn't start from zero every conversation.

## Decisions already made

Do not reopen these without checking with the project lead.

- Take Aim only. Explore and Focus come later.
- All 5 Take Aim JTBDs are in scope, each with both its Seeker and Coach spec.
- Each Seeker and Coach pair becomes one agent, not two separate AI calls.
- Real signup is required. No guest accounts, because guest sessions don't keep a person's profile.
- Take Aim uses outside research (job descriptions, employer information), not only internal documents.
- Use the content already loaded into the system for now. It will be replaced later.
- Use the existing worksheets and worksheet links for now. They will be updated later.
- The source spec file is **"3 - Take Aim Franklin JTBD."** Ignore the tab named "Job Seeker JTBD 1 DRAFT," it has been replaced by "Seeker JTBD 1."

## The 5 Take Aim JTBDs, in build order

Each one leads into the next, so we build them in this order.

1. **Motivation** (Seeker 1 + Coach 2): explain, specifically and credibly, why they want this role.
2. **Understand the role** (Seeker 3 + Coach 4): learn what people in the role actually do day to day, not the stereotype.
3. **Know what the role requires** (Seeker 5 + Coach 6): identify the knowledge, skills, abilities, tools, and experience that matter most.
4. **Translate past experience** (Seeker 7 + Coach 8): show how their background carries over, even when it looks different on the surface.
5. **Find and address gaps** (Seeker 9 + Coach 10): spot the gaps that genuinely matter and make a practical plan to close them.

## How we build it

We build the first JTBD all the way through (profile, agent, orchestrator, chat screen) before adding the rest. This proves the whole system works early, and every JTBD after that is just adding a new piece to something that already runs.

---

## Steps

### Step 1: Urgent cleanup (already in progress)

These fix problems in what's live today.

- Remove leftover references to the old Ascent program from Franklin's answers.
- Fix worksheet links that break or show up inconsistently. Cause found: the AI currently retypes each link itself and sometimes gets it wrong. Fix: the AI picks the right worksheet, and the system inserts the exact link automatically.
- Update the coaching tone in the answer instructions: match the person's situation, allow honest pushback, always end with a next step or a question, no em dashes.
- **(tech)** Apply the quick security fixes: turn on leaked-password protection, tighten privacy rules on chats so they only apply to logged-in users, lock the document table to backend-only, and turn off public access to the file-listing tool.

### Step 2: Foundation

- Start recruiting 5 to 10 real job seekers for testing. Look for people who already have a target role in mind, since that's who Take Aim is for.
- Write 2 to 3 realistic example people (personas) to test with throughout the build.
- **(tech)** Save a real copy of the current database structure into the code project. Right now it only exists inside the Supabase dashboard.
- **(tech)** Save the code for all existing backend functions into the code project too.
- **(tech)** Make sure the app requires real signup before anyone can start a coaching session.
- **(tech)** Add a login check to the existing question-answering function. It currently has none, which means anyone can use it and run up AI costs.
- **(tech)** Pick the outside research tool Take Aim will use to look up employers and roles, and plan for its cost and what happens when it fails.

### Step 3: Build the profile (Job Search State)

Build the profile using the "State" and "State Update" fields from all 5 JTBD specs. It covers roughly these items:

- **About the person:** education or career stage, target role, how firmly they've chosen it, target industry, target employers, level of role
- **Timing:** next deadline (application, networking, interview), time available to build skills
- **Motivation (JTBD 1):** their reasons, the experiences behind them, confidence in explaining it
- **Role understanding (JTBD 2):** what they now know about the role, assumptions corrected, firsthand versus online research
- **Role requirements (JTBD 3):** prioritized list of what the role needs, how confident we are in each, differences between employers
- **Transferable experience (JTBD 4):** skills that carry over, the experience behind each, how strong the evidence is
- **Gaps (JTBD 5):** gaps that matter and how serious they are, gaps that don't matter, chosen plan to address them, actions and deadlines, overall readiness
- **Across all JTBDs:** open questions still to check, overall confidence, signs of overwhelm or perfectionism, current JTBD, last completed JTBD, next step

Then:

- Write a plain description and example value for each item.
- **(tech)** Build the profile table, with privacy rules so each person only sees their own profile.
- **(tech)** Build a separate activity log that records which JTBD was worked on, why it was chosen, and the profile before and after each turn. The existing chat log only records "user said" and "assistant said," which isn't enough. This log is what we use to measure results during testing, so it must exist from the start.

### Step 4: Build JTBD 1 (Motivation)

- Turn JTBD 1 into working coaching instructions for the AI, combining its Seeker and Coach specs.
- **(tech)** Build the JTBD 1 agent as its own backend function, with a login check built in.
- **(tech)** Connect it to the existing document search and worksheets, as they are today.
- Test JTBD 1 against the example personas. Would an expert coach agree with how it handled each one?

### Step 5: Build the orchestrator and connect the chat

- Write the rules for how the orchestrator picks which JTBD to work on. Start from the "Next JTBD" section in each spec: normally Motivation → Role → Requirements → Translation → Gaps. Add rules for when to jump ahead or step back, for example a deadline tomorrow, or new information that changes their target.
- **(tech)** Build the orchestrator. Important limit: each backend function can only run for a short time, so the orchestrator must work one step per message and save progress in between. It cannot run the whole process in one go.
- **(tech)** Update the chat screen so it talks to the orchestrator and keeps context across messages, instead of treating every question as brand new.
- **(tech)** Add a visible "working on it" indicator. A coaching reply can take 10 to 40 seconds, and without it the app looks frozen.
- Walk through a full conversation using JTBD 1 with each example persona: sign up, get coached, profile updates, correct next step suggested. This is the first fully working version.

### Step 6: Add JTBDs 2 and 3

- Turn JTBD 2 (Understand the role) and JTBD 3 (Know what the role requires) into coaching instructions.
- **(tech)** Build both agents and add them to the orchestrator.
- **(tech)** Build the research abilities these two need: reading job descriptions a person pastes in, pulling out responsibilities and required skills, comparing across several postings, grouping requirements that mean the same thing, and looking up employer information with the outside research tool.
- **(tech)** Handle research failures gracefully. If a lookup fails or times out, Franklin says so and keeps coaching instead of breaking.
- Test both against the personas, and test the handoff from JTBD 1 to 2 to 3.

### Step 7: Add JTBDs 4 and 5, then connect everything

- Turn JTBD 4 (Translate past experience) and JTBD 5 (Find and address gaps) into coaching instructions.
- **(tech)** Build both agents and add them to the orchestrator.
- Run the full Take Aim journey, JTBD 1 through 5, with each persona.
- **(tech)** Fix anything that breaks across the full path.

### Step 8: Test with real people

- Run sessions with the job seekers recruited in Step 2.
- For each session, check:
  - Did Franklin pick the right JTBD to work on?
  - Would an expert coach agree with how it coached them?
  - Did it pick the right next step afterward?
  - Did it remember what mattered about the person?
  - Did the person feel guided rather than just answered?
- **(tech)** Use the activity log from Step 3 to measure these results across all sessions.
- **(tech)** Be available during sessions to fix problems as they come up.
- Write up what worked, what didn't, and a prioritized list of fixes.

## After this MVP

- Replace old content and worksheets with updated Franklin material.
- Add the next stage (Explore, then Focus), using the same approach.
- Finish the remaining security work: replace the shared password that protects document uploads and harden the upload functions.
- Update a hardcoded check in the question-answering function that assumes the old framework's structure. It will break once the framework content is replaced.