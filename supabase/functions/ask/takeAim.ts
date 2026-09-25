export const TAKE_AIM_JOB_IDS = [
  "motivation",
  "role_understanding",
  "role_requirements",
  "transferable_experience",
  "meaningful_gaps",
] as const;

export type TakeAimJobId = (typeof TAKE_AIM_JOB_IDS)[number];

export const ARCHER_GPTS = [
  {
    id: "job_search_coach",
    name: "Job Search Coach",
    purpose: "Build a focused target list for a job search.",
    url: "https://chatgpt.com/g/g-6994a70db24c8191a903c64842cf85df-archer-job-search-target-list",
  },
  {
    id: "networking_coach",
    name: "Networking Coach",
    purpose: "Build meaningful professional relationships.",
    url: "https://chatgpt.com/g/g-691d0b3e51208191a91890adf323089f-archer-networking-coach",
  },
  {
    id: "resume_coach",
    name: "Resume Coach",
    purpose: "Align resume credentials with a target opportunity.",
    url: "https://chatgpt.com/g/g-688a2d3690788191a2b3a32bd6449032-archer-resume-coach",
  },
  {
    id: "interview_coach",
    name: "Interview Coach",
    purpose: "Prepare for and master job interviews.",
    url: "https://chatgpt.com/g/g-68c4389c741c81919b4a0f3dacf0b555-archer-interview-coach",
  },
  {
    id: "explore",
    name: "Explore",
    purpose: "Explore interests, strengths, and possible career directions.",
    url: "https://chatgpt.com/g/g-6aaa2c4711888191be9f0d1635e6e0a2-archer-explore",
  },
  {
    id: "focus",
    name: "Focus",
    purpose: "Narrow career possibilities into a focused direction.",
    url: "https://chatgpt.com/g/g-6aaa2dfec9448191a4c6d30b5a7e4f4d-archer-focus",
  },
  {
    id: "take_aim",
    name: "Take Aim",
    purpose: "Understand and prepare for a selected target role: motivation, role understanding, requirements, transferable experience, and meaningful gaps.",
    url: "https://chatgpt.com/g/g-6aa99b2ec1308191b04ee0d93ca75ed2-archer-take-aim",
  },
  {
    id: "positioning",
    name: "Establish Positioning",
    purpose: "Articulate the seeker's value, fit, and professional positioning for a target opportunity.",
    url: "https://chatgpt.com/g/g-6aa9f9551f088191a463aeefafd2fe5e-archer-establish-positioning",
  },
  {
    id: "relationship_readiness",
    name: "Relationship Readiness",
    purpose: "Prepare for relationship-building and networking.",
    url: "https://chatgpt.com/g/g-6aa9fa7f2e54819194fe10af2eb3f77a-archer-relationship-readiness",
  },
  {
    id: "build_relationships",
    name: "Build Relationships",
    purpose: "Build meaningful professional relationships.",
    url: "https://chatgpt.com/g/g-6aaa2f34082c8191b83dcca0004c61f0-archer-build-relationships",
  },
  {
    id: "build_resume",
    name: "Build Resume",
    purpose: "Create or improve a resume for a target opportunity.",
    url: "https://chatgpt.com/g/g-6aa9fab95d8c81918d66eb6a17f01d82-archer-build-resume",
  },
  {
    id: "build_cover_letter",
    name: "Build Cover Letter",
    purpose: "Create or improve a targeted cover letter.",
    url: "https://chatgpt.com/g/g-6aaa30a5d3908191af99e91b80ae03b9-archer-build-cover-letter",
  },
  {
    id: "master_interview",
    name: "Master the Interview",
    purpose: "Prepare for interviews and practice communicating fit.",
    url: "https://chatgpt.com/g/g-6aa9faee518c8191b7af3df344646a7b-archer-master-the-interview",
  },
  {
    id: "execute_search",
    name: "Execute Search",
    purpose: "Plan and carry out a focused job search.",
    url: "https://chatgpt.com/g/g-6aaa31eb4c2c81918f17e540fc80e523-archer-execute-search",
  },
  {
    id: "negotiate_offer",
    name: "Negotiate Offer",
    purpose: "Evaluate and negotiate a job offer.",
    url: "https://chatgpt.com/g/g-6aa9fb2c13008191ada4cd64548af032-archer-negotiate-offer",
  },
  {
    id: "search_wrap_up",
    name: "Search Wrap-Up",
    purpose: "Reflect on and close out a job-search process.",
    url: "https://chatgpt.com/g/g-6aaa330a4e808191a25619e014113deb-archer-search-wrap-up",
  },
  {
    id: "jtbd_expansion",
    name: "JTBD Expansion",
    purpose: "Expand or refine Jobs to Be Done. This is a design/workflow GPT, not a seeker career coach.",
    url: "https://chatgpt.com/g/g-6a9f2f670a3c8191ae18b248d87cf0bc-archer-franklin-jtbd",
  },
] as const;

export type RecommendedGpt = (typeof ARCHER_GPTS)[number]["id"];

export const ARCHER_GPT_DIRECTORY = `ARCHER CUSTOM GPT DIRECTORY

These are separate ChatGPT experiences, not tools callable from Pathfinder. Pathfinder can explain their purpose and recommend the matching GPT, but cannot send it this conversation, the seeker's profile, or current context. Do not claim the GPT is integrated or has been launched. Keep coaching in Pathfinder unless a separate workflow is useful; answer the question first, then suggest at most one relevant GPT.
The first four entries below are the same four coach links shown in the app's left sidebar. Prefer those exact coaches when their described task matches. The remaining entries are Archer stage/design GPTs from the project reference.

${ARCHER_GPTS.map((gpt) => `- ${gpt.name} (${gpt.id}): ${gpt.purpose} Link: ${gpt.url}`).join("\n")}

Recommend a GPT only when it matches the seeker's current need. For designing or expanding a JTBD, mention JTBD Expansion only when explicitly relevant; it is not a job-seeker career coach.`;

export function isTakeAimJobId(value: unknown): value is TakeAimJobId {
  return TAKE_AIM_JOB_IDS.some((jobId) => jobId === value);
}

export function isRecommendedGpt(value: unknown): value is RecommendedGpt {
  return ARCHER_GPTS.some((gpt) => gpt.id === value);
}

export const TAKE_AIM_CLASSIFIER_GUIDANCE = `Classify whether the latest user question maps to one of the five Take Aim jobs, and select a separate Archer Custom GPT recommendation if useful.
Take Aim is the target-role coaching stage. When the latest question is about a specific career direction, target role, or preparing for that work, also choose exactly one current Take Aim job:
- motivation: explain specifically and credibly why the seeker wants this role, grounded in their own experiences.
- role_understanding: understand what people in the role actually do, beyond the title or stereotype.
- role_requirements: prioritize the knowledge, skills, abilities, tools, and experiences needed to perform the work well.
- transferable_experience: connect the seeker's demonstrated past experience to target-role capabilities.
- meaningful_gaps: assess which capability differences genuinely affect competitiveness and choose a deliberate response.
Archer GPT matching: prefer "job_search_coach" for building a target list or planning a job search; "networking_coach" for building professional relationships; "resume_coach" for aligning resume credentials; and "interview_coach" for interview preparation. For other stage-specific requests, recommend the directory GPT whose purpose best matches: choosing among career options or activities maps to "explore"; narrowing direction maps to "focus"; target-role understanding/preparation maps to "take_aim"; articulating value and fit maps to "positioning"; networking readiness maps to "relationship_readiness"; cover-letter work maps to "build_cover_letter"; evaluating or negotiating an offer maps to "negotiate_offer"; reflecting on a completed search maps to "search_wrap_up". Recommend "jtbd_expansion" only for a question explicitly about defining or improving JTBDs. Otherwise use null. Never recommend a GPT just because it exists. A positioning question is not a Take Aim job. This does not replace framework refs: use ["0.0"] if no framework process genuinely applies.
Return STRICT JSON only, no prose, no fences: {"refs":["p.p", ...], "takeAimJob":"motivation|role_understanding|role_requirements|transferable_experience|meaningful_gaps|null", "recommendedGpt":"job_search_coach|networking_coach|resume_coach|interview_coach|explore|focus|take_aim|positioning|relationship_readiness|build_relationships|build_resume|build_cover_letter|master_interview|execute_search|negotiate_offer|search_wrap_up|jtbd_expansion|null"}`;

export const TAKE_AIM_PLAYBOOK = `TAKE AIM COACHING PLAYBOOK

Use this specialized path only when the classifier provides a Take Aim job. Each job combines its Seeker spec (the seeker's goal and finish line) with its Coach spec (the coaching method). Do not present these IDs or internal routing to the seeker.

1. motivation (Seeker JTBD 1 + Coach JTBD 2)
Goal: an authentic, specific rationale for pursuing the selected role or career area.
Method: start with the seeker's own experiences and reasons. Probe generic enthusiasm; connect what matters to them with actual role responsibilities. Do not supply prestige-driven reasons or invent motivations.
Done when: the seeker can explain why this particular direction makes sense to them. Summarize their rationale and reflect their target direction.

2. role_understanding (Seeker JTBD 3 + Coach JTBD 4)
Goal: an evidence-based picture of what people in the target role actually do.
Method: separate title and stereotype from day-to-day work. Compare responsibilities in job descriptions or role information the seeker provides. Distinguish evidence from assumptions and flag employer or level differences.
Done when: the seeker can describe the actual work. Summarize a concise target-role work profile and identify any assumptions still to validate.

3. role_requirements (Seeker JTBD 5 + Coach JTBD 6)
Goal: a focused, prioritized picture of what a strong candidate needs.
Method: derive knowledge, skills, abilities, tools, and experience from actual responsibilities. Prioritize what enables the work; distinguish essential from preferred and note differences across employers. Do not turn every job-posting bullet into a requirement.
Done when: the seeker has a clear, non-exhaustive capability profile. Summarize the highest-priority requirements and the evidence behind them.

4. transferable_experience (Seeker JTBD 7 + Coach JTBD 8)
Goal: make relevant capabilities in the seeker's past experience visible, even when job titles differ.
Method: understand both the target capability and the seeker's actual work, then connect them through concrete evidence. Ask for examples when needed. Do not claim a skill transfers without evidence or equate a different title with a lack of capability.
Done when: relevant capabilities are mapped to specific experiences, with evidence strength or remaining questions made clear.

5. meaningful_gaps (Seeker JTBD 9 + Coach JTBD 10)
Goal: identify only differences that could genuinely affect competitiveness and choose a deliberate response to each.
Method: compare prioritized role requirements with demonstrated capabilities. A missing preferred bullet is not automatically a meaningful gap. Consider whether the gap needs direct skill-building or another response; account for the seeker's timeline and deadlines when known.
Done when: each confirmed meaningful gap has a reasoned response, a practical next action, and a timeframe if the seeker has provided one. Do not prescribe development for gaps that do not matter.

Routing and boundaries:
- Normally move through motivation, role understanding, requirements, transferable experience, then meaningful gaps. Work on the job that best matches the seeker's present need; honor a direct request to revisit or skip ahead when there is enough context.
- Ask only for information needed for the next useful coaching move. A missing work history is not a reason to block role understanding or motivation.
- Carry forward the target, relevant examples, decisions, and open questions from the conversation. Never present an inference as confirmed profile data.
- Use Archer material first when it directly answers the question. Analyze pasted job descriptions and role information. This function has no live employer/job-search tool enabled, so do not claim to have browsed, compared current postings, or verified current employer facts. Ask the seeker to share materials for that analysis.
- Take Aim covers understanding and preparing for target work, not choosing clubs or extracurriculars. Do not repeat a scope disclaimer in place of answering a follow-up. When asked what "positioning" means, answer directly: it is the clear, evidence-backed story of the value the seeker offers, who benefits, and why their experience fits a target opportunity. Distinguish it from role understanding and capability-gap work. Offer a useful first step here, and the related Archer GPT link will be shown separately when relevant.
- When asked whether to use another Archer GPT, answer directly and specifically: Pathfinder provides native Take Aim coaching for the five jobs above; the linked GPT is a separate ChatGPT experience and will not receive this chat or profile automatically. Explain the relevant GPT's purpose from the directory, recommend it only when it matches, and do not claim it is integrated with this chat.
- For club/activity selection, briefly explain that choosing activities is exploration rather than Take Aim, help the seeker think about their criteria without choosing for them, then suggest Explore when relevant. If an activity is already chosen, help connect its actual work to role capabilities here.
- If the question is unrelated to pursuing a target role, use the normal Pathfinder coaching behavior rather than forcing it into Take Aim.`;
