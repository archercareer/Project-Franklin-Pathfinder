# Take Aim in Pathfinder: acceptance test checklist

Use this checklist after deploying the updated `ask` Edge Function. The Take Aim coach runs in the existing Pathfinder chat and uses the same signed-in or guest session as the rest of the app. Record the account type, target role, prompt, actual response, and pass/fail for each run. Do not use real personal information in test notes.

## JTBD coverage

| ID | Test prompt / setup | Pass when |
|---|---|---|
| TA-01 Motivation | “I want to be a product manager because it sounds exciting. Help me figure out why.” | Franklin asks about the seeker's own experiences and motivations instead of inventing reasons or relying on prestige. It helps produce a specific rationale tied to the target role. |
| TA-02 Role understanding | “What does a data analyst actually do day to day? I think it is mostly making dashboards.” | Franklin separates assumptions from evidence, explains the actual work only to the extent supported by Archer material, and invites job descriptions or other role information when needed. |
| TA-03 Role requirements | Paste two job descriptions for the same role at different levels and ask what matters most. | Franklin extracts and prioritizes capabilities based on the work, distinguishes essential from preferred, and calls out meaningful employer/level differences without treating every bullet as mandatory. |
| TA-04 Transferable experience | “I worked in retail, but I want to move into customer success. What transfers?” | Franklin asks for concrete examples as needed and maps demonstrated experience to target capabilities without assuming all skills transfer or treating the different title as disqualifying. |
| TA-05 Meaningful gaps | Give a target capability list and a short experience inventory with one missing preferred skill. | Franklin checks whether the difference can genuinely affect competitiveness, does not label every missing preference a gap, and gives a practical response only for confirmed gaps. |

## Routing, context, and boundaries

| ID | Test prompt / setup | Pass when |
|---|---|---|
| TA-06 Default progression | Start with motivation, then complete a role-understanding, requirements, transfer, and gaps exchange. | Franklin moves through the five jobs in the intended order when useful, closes each job with a concrete next step, and does not skip ahead without enough context. |
| TA-07 Direct jump or revisit | With a target role established, ask directly to compare requirements; later ask to revisit motivation. | Franklin follows the direct request, uses known context, and does not insist on restarting the sequence. |
| TA-08 Follow-up reference | Ask for a prioritized list, then ask “Which of those should I work on first?” | Franklin resolves “those” from the prior exchange and answers in the same coaching context. |
| TA-09 Longer conversation | Continue a Take Aim conversation for more than three exchanges; refer to the original target role and earlier experience. | Franklin retains the details still present in recent conversation history and does not state unsupported profile facts as confirmed. Note any lost context; durable Job Search State is not part of this change. |
| TA-10 Missing experience | Skip the experience question or say “I don't have a resume ready.” | Franklin continues useful role/motivation coaching and asks for experience only when it is needed to make a specific transfer or gap judgment. |
| TA-11 No selected target | Ask for help when still deciding among several career areas. | Franklin helps clarify what is known or asks a focused question; it does not pretend the person has selected a role. |
| TA-12 Extracurricular boundary | “Which clubs should I join to get into consulting?” | Franklin explains that selecting activities belongs to career exploration, gives a useful next step rather than repeating a refusal, and offers the Explore GPT. If the seeker already has an activity, Franklin can help relate its actual work to role capabilities. |
| TA-13 Unrelated question | Ask an unrelated non-career question in a new conversation. | Franklin does not force it into a Take Aim job and uses the existing Pathfinder out-of-scope behavior. |

## Evidence, links, and failure behavior

| ID | Test prompt / setup | Pass when |
|---|---|---|
| TA-14 No live research claim | Ask for current openings or recent employer-specific facts without providing sources. | Franklin does not claim to have browsed or verified current information. It asks the seeker to provide a posting or clearly identifies what information is unavailable. |
| TA-15 Pasted source analysis | Provide a job description and ask for responsibilities and required skills. | Franklin grounds its extraction in the supplied text, distinguishes responsibilities from qualifications, and does not add unsupported requirements. |
| TA-16 Archer source precedence | Ask a question covered by retrieved Archer material, then one requiring employer-specific information. | Archer material leads when relevant; unsupported employer details are not presented as Archer facts. |
| TA-17 Search/framework unavailable | Simulate the existing framework-fetch or model failure in a non-production environment. | The app shows the existing plain-language error, does not show a success-shaped answer, and allows a retry. |
| TA-18 Worksheet behavior | Ask a question that has a matching framework task and worksheet. | Pathfinder still inserts the exact framework worksheet link and task tag behavior; Take Aim coaching must not invent or rewrite links. |
| TA-19 Guest session | Repeat TA-01 and TA-08 in guest mode. | Coaching works in the current chat without implying that a durable profile was saved. |
| TA-20 Signed-in persistence | Repeat TA-01, reopen the conversation, and send a follow-up. | The answer and existing conversation continue to work. Do not interpret chat-history persistence as a separate Job Search State profile. |
| TA-21 Positioning and specialist GPT | Ask “What does positioning mean, and should I use the linked GPTs?” during a Take Aim conversation. | Franklin explains positioning as the evidence-backed story of value and fit, distinguishes it from Take Aim, recommends the Establish Positioning GPT for that request, and provides its working link. The link clearly says it opens a separate ChatGPT conversation without Pathfinder history or profile. |
| TA-22 Take Aim GPT link | Ask a question about motivation, role requirements, transferable experience, or meaningful gaps. | Franklin answers using the matching native Take Aim coaching method and shows a link to Archer's Take Aim GPT. The copy does not imply that this GPT is called or receives context automatically. |
| TA-23 Archer GPT directory | Ask what Archer GPTs are available, then ask for the best GPT for resume, cover letter, networking, interview, job-search, offer, and search wrap-up help. | Franklin can describe the relevant GPT from its prompt directory and provides the matching link for each need. Each card opens the expected GPT and warns that the Pathfinder conversation is not transferred. |
| TA-24 JTBD Expansion boundary | Ask how to create or refine a JTBD; separately ask for ordinary career coaching. | For JTBD design, Franklin can identify and link JTBD Expansion as a workflow/design GPT. It does not recommend this internal-oriented GPT for ordinary seeker coaching. |
| TA-25 Left-sidebar coach awareness | Ask Franklin what the Job Search Coach, Networking Coach, Resume Coach, and Interview Coach do, then ask for help matching an appropriate coach to a task. | Franklin accurately names the purpose of each left-sidebar coach and recommends the exact matching coach/link: Job Search Coach for a focused target list, Networking Coach for relationships, Resume Coach for aligning credentials, Interview Coach for interview preparation. It does not confuse these with similarly named stage GPTs. |

## Release gates

- Run TA-01 through TA-05 at least once with a realistic persona and have a career coach judge whether the guidance follows the corresponding JTBD.
- Run TA-06 through TA-12 to check that the specialist boundaries are clear, especially around extracurricular selection.
- Run TA-21 through TA-25 to confirm the response differentiates capabilities, the stage and left-sidebar coach directories are usable, and only relevant GPT links are offered.
- Re-run the existing Pathfinder chat, worksheet-link, guest, sign-in, and conversation-reopen checks to catch regressions outside Take Aim.
- Do not mark the live employer/job-description research capability as passed: the existing Edge Function has no live web-search tool enabled. Current postings must be provided by the seeker.
- Track any context loss in TA-09. Persistent structured Job Search State and a per-turn activity log remain separate foundation work.
