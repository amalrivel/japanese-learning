# Personalized Learning PWA — MVP

Status: approved task translated into a proposed implementation blueprint; no MVP
features are claimed complete. Working title; first content is Japanese JLPT N3.
Implementation order and evidence belong in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Goal and user

Give one learner a dependable loop from externally authored learning material to
practice, results, and a portable teacher summary. The engine must work with other
subjects: Japanese-specific behavior belongs in pack content, not grading code.
Each authenticated Firebase UID owns independent data. Initial access is limited
to an owner-configured UID allowlist, without an administration interface.

The external teacher (initially ChatGPT Work) authors and interprets content; the
application never calls an LLM to import, grade, or summarize.

## Journeys

1. Sign in with Google through Firebase Authentication; an unapproved account gets
   no learning-data access. Sign out clears application state.
2. Upload a UTF-8 JSON file or paste JSON. Receive actionable field errors or a
   preview with title, subject, skills, question counts/types, and duplicate status.
   Confirm explicitly before importing. Failed imports write nothing.
3. Select an imported pack and start a practice attempt. Answer all questions,
   save a draft, and resume it later. The UI distinguishes saved, saving, and
   failed saves; unsaved answers are not promised to survive a reload.
4. Submit once. Objective questions receive deterministic results; other answers
   reveal a model answer/rubric and require self-assessment. Complete the review,
   then revisit the saved attempt from history.
5. See basic progress by skill over the most recent 100 completed attempts, with
   objective accuracy separated from self-assessment. This is practice evidence,
   not a calibrated mastery estimate.
6. Open the protected Teacher Report, copy or download its versioned JSON, and
   provide it to the external teacher. Import the next generated pack using the
   same process. Authenticated browser access by ChatGPT Work is an experiment;
   manual sharing is the guaranteed MVP path.

## Scope and success criteria

| Requirement | Observable MVP success | Milestone |
| --- | --- | --- |
| Identity and isolation | Anonymous/unapproved users denied; user A cannot access B's packs, attempts, or report | M2, M7 |
| Versioned content | Example validates; malformed/unsupported packs fail with paths and no writes | M3 |
| Upload/paste and preview | Both inputs produce the same preview; import requires confirmation | M3 |
| Duplicate protection | Concurrent identical imports create one pack; changed content under the same ID returns conflict | M3 |
| Four exercise families | Multiple choice, one blank, short answer, and self-review render and accept typed answers | M4 |
| Save and resume | Acknowledged draft answers survive sign-out/sign-in; failed saves are visible | M4 |
| Results and grading | Objective fixtures match documented normalization; manual work is never falsely auto-graded | M5 |
| Durable history | Retried submit/assessment does not create additional attempts or mutate completed results | M5 |
| Skill progress | Known attempt fixtures produce exact counters and a clearly labeled bounded window | M6 |
| Teacher handoff | Owner exports parseable teacher-context v1 without credentials; logged-out requests fail and responses are not cached | M6, M7 |
| Complete learning loop | Import → save/resume → submit → self-review → report → second import works without any LLM key | M7 |
| Installability (after core) | Correct icons/manifest and browser installation verification; online behavior is explicit | M8, optional after MVP |

## Deliberate exclusions and assumptions

- No real-time tutor, OpenAI API, custom MCP server, automatic publishing, or
  guaranteed scheduled ChatGPT Work execution.
- No rich HTML/Markdown execution, media attachments, multiple blanks, timed exams,
  course builder, sharing, pack editing/deletion, or cross-user teacher role.
- No advanced spaced repetition, gamification, multi-tenant administration,
  complex analytics, full offline sync, or offline answer storage.
- Ratings are learner self-assessments; there is no human-marker workflow in MVP.
  Every question must be answered before submission; drafts may be partial.
- The learner importing a file can see its original keys. Key isolation prevents
  accidental practice/API disclosure, not cheating by the content owner.
- Owner supplies Firebase/Vercel configuration later. No resources are provisioned
  during planning. Pack correctness is reviewed in preview; validation cannot
  establish whether AI-generated educational content is true.
