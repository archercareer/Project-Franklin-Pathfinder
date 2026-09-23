# Take Aim intake (M8)

Six questions, signed-in only, across three screens. Everything required except question 5.

Guests get no form. Franklin works from what they say in the conversation.

---

## The form

### Screen 1
| # | Field | Question | Required |
|---|---|---|---|
| 1 | `target_role`, `target_industry`, `target_level` | Target role or career area, plus industry and level | Yes |
| 2 | `why_this_role` | Why this? A rough answer is fine | Yes |

### Screen 2
| # | Field | Question | Required |
|---|---|---|---|
| 3 | `career_stage` | Where are you right now? | Yes |
| 4 | `longer_term_goals` | What do you want out of your career longer term? | Yes |

### Screen 3
| # | Field | Question | Required |
|---|---|---|---|
| 5 | `relevant_experiences` | Two or three relevant things you've done | **Optional** |
| 6 | `next_deadline` | Your next deadline | Yes |

### Optional, not on a screen
| Field | Question |
|---|---|
| `target_employers` | Any specific employers |

Question 2 is deliberately low-effort. Pushing for a good answer here is JTBD 1's job, not the
form's — the rough version is the raw material the coaching works on.

---

## Behaviour rules

These belong in the prompt (M16, M17), not just in the form.

1. **Question 5 skipped is a normal state, not a gap to close.** Franklin helps without it and
   asks for experiences in chat only when it actually needs them. It must not open every
   conversation demanding a work history.
2. **Guests have no saved answers.** Franklin works from what they say in the conversation and
   doesn't imply anything is missing.
3. **No direction is fine.** Franklin gives general career advice rather than refusing, grounded
   in Archer's content and data first. Archer's Explore GPT can be offered as an option.

---

## Source precedence — Archer first, web only for real gaps

"Always ground in Archer's content" and "search the web when Archer's content is thin" pull in
opposite directions. Left implicit, the model drifts toward whichever is easier to satisfy —
usually search, because it always returns something. The order has to be stated:

1. **Archer's content is the default source.** Retrieved program material and the framework are
   what an answer is built from.
2. **If Archer covers the question, answer from Archer and do not search.** Thin is not the same
   as absent.
3. **Search only to fill a gap Archer genuinely doesn't cover** — a specific employer, a current
   job description, live industry detail.
4. **Never let a web result replace Archer material that exists.** If both speak to the same
   point, Archer wins.
5. **When both are used, Archer frames the answer and the web fills the named gap.** Say which
   part came from outside.

This is decidable only at the answer step, with the retrieved content actually in hand — which
is why M12 puts the search decision there rather than in the classifier.

---

## Storage shape (M9)

One row per signed-in person, one nullable column per field above, plus:

- `source` — `form` or `conversation`. A conversational answer is lower confidence than a
  deliberate form entry, and Franklin should weight it accordingly.
- `updated_at` — a conversational answer can supersede a form answer mid-session.

Guests have no row. Their answers live only in the conversation, which is the accepted cost of
the M1 decision.

---

## Open — this affects M25

With two collection paths, the baseline has to name which one it runs. A signed-in session starts
with six fields filled; a guest session starts empty. Those produce materially different answers.

Recommend baselining the **signed-in path** — M25 already depends on M10, so the form exists by
then — and running the guest path as a separate, smaller pass. A baseline mixed across both would
make M26's comparison unreadable.
