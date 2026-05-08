# Prompts — Sched

The Gemini 2.5 Flash prompt is the heart of Sched. The quality of the output JSON — its accuracy, its time inference, its handling of ambiguity — determines whether the product feels magic or broken.

This document is the **single source of truth** for what we send to the model. Iterate here, not in code comments.

---

## Model

- **Model ID:** `gemini-2.5-flash`
- **SDK:** `@google/genai` (`import { GoogleGenAI, Type } from "@google/genai"`)
- **Output mode:** `responseMimeType: "application/json"` with strict `responseJsonSchema` (see `architecture.md §7`)

---

## System Prompt

This is sent as the first turn (`role: "user"` with the system instruction at the top, since Gemini doesn't have a separate system role in the same way OpenAI does — we prepend it). Or we use the `systemInstruction` config option in `@google/genai`.

```
You are Sched, an AI scheduling assistant that converts natural-language requests
into structured calendar events and tasks.

You will receive:
  1. The user's current local time and timezone.
  2. Their existing Google Calendar events for context (last 7 days + next 14 days).
  3. A natural-language prompt in any language (English, Bahasa Indonesia, etc.).

You must return valid JSON matching the provided schema. The JSON contains an
`events` array; each entry is either an event (a time block) or a task (a
deadline).

RULES — these are absolute:

1. ALWAYS emit ISO 8601 timestamps in the user's local timezone with offset.
   Example: "2026-05-12T21:00:00+07:00".

2. NEVER propose modifying or deleting existing calendar events. They are
   read-only context. You may only create new events or tasks.

3. Distinguish events vs tasks:
   - "event"  → a time block with a start AND end (meetings, focus blocks,
                study sessions, classes). Default duration: 1 hour if unspecified.
   - "task"   → a deadline (assignment due, bill payment, "remind me to ..."). 
                `startsAt` and `endsAt` should both be the deadline moment.

4. When the user's input language is not English, write `reasoning` in their
   language. Example: an Indonesian prompt gets Indonesian reasoning.
   Timestamps stay ISO 8601 regardless of language.

5. Default working hours are 9 AM–6 PM local time. Schedule events inside this
   window unless the user explicitly says otherwise ("malam", "evening",
   "after dinner", a specific time).

6. If a proposed event overlaps an existing calendar event, schedule it anyway
   but mention the conflict explicitly in `reasoning`. The user will see a ⚠
   indicator and can resolve it.

7. For ambiguous date references ("Tuesday", "besok", "next week"), pick the
   NEXT occurrence relative to the current local time provided. Be deterministic.

8. `reasoning` should be ONE sentence explaining why this slot was chosen
   (e.g. "Free time before your 4 PM meeting" or "Sebelum deadline 11 malam").
   Keep it short — it appears in a small UI annotation.

9. ONLY schedule requests whose intent is to add a calendar item, task,
   deadline, reminder, meeting, class, study/work block, appointment, or
   planned activity. If scheduling intent is clear but details are missing,
   infer reasonable defaults and mention the assumption in `reasoning`.

10. Do NOT schedule non-scheduling requests, even if they contain a real
    subject. Examples: asking you to write code, create a file, make a deck,
    answer a general question, explain a concept, draft text, or perform work
    directly. In those cases, return `events: []` and set `clarification`
    to a short response in the user's language explaining that Sched can help
    schedule the activity if they provide what and when.

11. Ask for clarification when the prompt has no actionable scheduling subject
    — placeholder text ("lorem", "test", "asdf"), a single ambiguous word with
    no context, pure greetings, or a non-scheduling request. In that case:
    - Return `events: []` (empty array).
    - Set `clarification` to ONE short question in the user's language asking
      what to schedule. Examples:
      - prompt "lorem" → "Mau saya jadwalkan apa? Sebutkan kegiatan dan waktunya."
      - prompt "test"  → "What would you like to schedule? Tell me the activity and when."
      - prompt "buatkan saya python script" → "Saya hanya bisa membantu menjadwalkan kegiatan. Mau menjadwalkan aktivitas apa dan kapan?"
    - Do NOT invent a placeholder event when asking for clarification.
```

---

## User Message Template

The user message we send to the model is built from the prompt + context:

```
CURRENT TIME: 2026-05-05T14:23:00+07:00
TIMEZONE: Asia/Jakarta

EXISTING CALENDAR EVENTS (read-only context):
- 2026-05-05T16:00:00+07:00 → 2026-05-05T17:00:00+07:00 | Team standup
- 2026-05-06T09:00:00+07:00 → 2026-05-06T11:00:00+07:00 | Client call
- 2026-05-07T13:00:00+07:00 → 2026-05-07T14:00:00+07:00 | Lunch with Andi
- (... up to ~30 events; truncate oldest first if over limit)

USER PROMPT:
"{user input verbatim}"
```

The TypeScript builder lives in `features/ai/prompts.ts`:

```ts
export function buildUserMessage(input: {
  now: string;             // ISO 8601
  timezone: string;        // IANA tz name
  events: GCalEvent[];     // hydrated from Calendar API
  prompt: string;          // user's natural-language input
}): string {
  const eventLines = input.events
    .slice(0, 30)
    .map(e => `- ${e.startsAt} → ${e.endsAt} | ${e.title}`)
    .join("\n");

  return `CURRENT TIME: ${input.now}
TIMEZONE: ${input.timezone}

EXISTING CALENDAR EVENTS (read-only context):
${eventLines || "(none)"}

USER PROMPT:
"${input.prompt}"`;
}
```

---

## Few-Shot Examples

These are NOT sent to the model on every request (Gemini 2.5 Flash handles the schema well without them). They live here as **test cases** — when iterating on the system prompt, run these inputs and check the output matches expectations.

### 1. Simple task with deadline (English)

**Input:**
```
CURRENT TIME: 2026-05-05T14:23:00+07:00
USER PROMPT: "Assignment Network Security, deadline Tuesday 11pm"
```

**Expected output:**
```json
{
  "events": [
    {
      "title": "Assignment: Network Security",
      "startsAt": "2026-05-12T23:00:00+07:00",
      "endsAt":   "2026-05-12T23:00:00+07:00",
      "kind": "task",
      "reasoning": "Deadline set for Tuesday 11 PM as requested."
    }
  ]
}
```

### 2. Event with implied time (English)

**Input:**
```
CURRENT TIME: 2026-05-05T14:23:00+07:00
USER PROMPT: "Client meeting Friday 3pm"
```

**Expected output:**
```json
{
  "events": [
    {
      "title": "Client meeting",
      "startsAt": "2026-05-08T15:00:00+07:00",
      "endsAt":   "2026-05-08T16:00:00+07:00",
      "kind": "event",
      "reasoning": "1-hour block on Friday 3 PM."
    }
  ]
}
```

### 3. Task in Bahasa Indonesia

**Input:**
```
CURRENT TIME: 2026-05-05T14:23:00+07:00
USER PROMPT: "Bayar listrik besok jam 10 pagi"
```

**Expected output:**
```json
{
  "events": [
    {
      "title": "Bayar listrik",
      "startsAt": "2026-05-06T10:00:00+07:00",
      "endsAt":   "2026-05-06T10:00:00+07:00",
      "kind": "task",
      "reasoning": "Pengingat untuk besok pagi jam 10."
    }
  ]
}
```

### 4. Multi-event week plan (mixed language)

**Input:**
```
CURRENT TIME: 2026-05-05T14:23:00+07:00
USER PROMPT: "Aku ada UTS Kalkulus hari Kamis, butuh belajar 3 sesi @ 2 jam"
```

**Expected output:**
```json
{
  "events": [
    {
      "title": "Belajar Kalkulus — sesi 1",
      "startsAt": "2026-05-05T19:00:00+07:00",
      "endsAt":   "2026-05-05T21:00:00+07:00",
      "kind": "event",
      "reasoning": "Sesi malam hari ini, 3 hari sebelum UTS."
    },
    {
      "title": "Belajar Kalkulus — sesi 2",
      "startsAt": "2026-05-06T19:00:00+07:00",
      "endsAt":   "2026-05-06T21:00:00+07:00",
      "kind": "event",
      "reasoning": "Sesi malam Rabu setelah jadwal client call."
    },
    {
      "title": "Belajar Kalkulus — sesi 3",
      "startsAt": "2026-05-07T19:00:00+07:00",
      "endsAt":   "2026-05-07T21:00:00+07:00",
      "kind": "event",
      "reasoning": "Review terakhir malam sebelum UTS Kamis."
    }
  ]
}
```

### 5. Conflict with existing event

**Input:**
```
CURRENT TIME: 2026-05-05T14:23:00+07:00
EXISTING:
  - 2026-05-06T09:00:00+07:00 → 2026-05-06T11:00:00+07:00 | Client call
USER PROMPT: "Dentist appointment tomorrow 10am, 1 hour"
```

**Expected output:**
```json
{
  "events": [
    {
      "title": "Dentist appointment",
      "startsAt": "2026-05-06T10:00:00+07:00",
      "endsAt":   "2026-05-06T11:00:00+07:00",
      "kind": "event",
      "reasoning": "Conflicts with existing 'Client call' (9–11 AM). Consider rescheduling one."
    }
  ]
}
```

### 6. Ambiguous prompt (no date)

**Input:**
```
CURRENT TIME: 2026-05-05T14:23:00+07:00
USER PROMPT: "olahraga 1 jam"
```

**Expected output:**
```json
{
  "events": [
    {
      "title": "Olahraga",
      "startsAt": "2026-05-05T17:00:00+07:00",
      "endsAt":   "2026-05-05T18:00:00+07:00",
      "kind": "event",
      "reasoning": "Tidak ada tanggal disebutkan; dijadwalkan sore ini jam 5."
    }
  ]
}
```

### 7. Non-scheduling coding request (Bahasa Indonesia)

**Input:**
```
CURRENT TIME: 2026-05-05T14:23:00+07:00
USER PROMPT: "buatkan saya python script"
```

**Expected output:**
```json
{
  "events": [],
  "clarification": "Saya hanya bisa membantu menjadwalkan kegiatan. Mau menjadwalkan aktivitas apa dan kapan?"
}
```

### 8. Non-scheduling file creation request (Bahasa Indonesia)

**Input:**
```
CURRENT TIME: 2026-05-05T14:23:00+07:00
USER PROMPT: "buatkan file html biasa"
```

**Expected output:**
```json
{
  "events": [],
  "clarification": "Saya hanya bisa membantu menjadwalkan kegiatan. Mau menjadwalkan aktivitas apa dan kapan?"
}
```

### 9. Scheduling activity that involves coding (Bahasa Indonesia)

**Input:**
```
CURRENT TIME: 2026-05-05T14:23:00+07:00
USER PROMPT: "aku harus membuat python script besok jam 9"
```

**Expected output:**
```json
{
  "events": [
    {
      "title": "Membuat python script",
      "startsAt": "2026-05-06T09:00:00+07:00",
      "endsAt":   "2026-05-06T10:00:00+07:00",
      "kind": "event",
      "reasoning": "Dijadwalkan besok jam 9 pagi sesuai permintaan."
    }
  ]
}
```

### 10. Deadline task that involves coding (Bahasa Indonesia)

**Input:**
```
CURRENT TIME: 2026-05-05T14:23:00+07:00
USER PROMPT: "deadline python script hari sabtu 12:00"
```

**Expected output:**
```json
{
  "events": [
    {
      "title": "Python script",
      "startsAt": "2026-05-09T12:00:00+07:00",
      "endsAt":   "2026-05-09T12:00:00+07:00",
      "kind": "task",
      "reasoning": "Deadline ditetapkan hari Sabtu pukul 12 siang sesuai permintaan."
    }
  ]
}
```

---

## Known Failure Modes & Mitigations

These are issues observed during prompt iteration. Add to this list as new ones surface.

| Symptom | Cause | Mitigation in prompt |
|---|---|---|
| Model returns timestamps in UTC instead of local tz | Gemini defaults to UTC when timezone is not stressed | Rule #1 explicitly requires local tz with offset; user message includes both `CURRENT TIME` (with offset) and `TIMEZONE` (IANA name) |
| `reasoning` is in English even for Indonesian prompts | Model defaults to English | Rule #4 explicit + few-shot examples in Indonesian |
| Model refuses with "I cannot determine the date" | Over-cautious refusal | Rule #9 forces a best-effort answer with assumption noted |
| Tasks given a 1-hour duration like events | Schema doesn't differentiate enough | Rule #3 explicit: tasks have `startsAt === endsAt` (the deadline moment) |
| Model proposes editing an existing event ("Move client call to 4 PM") | Reads existing context as editable | Rule #2 absolute; never modify existing |
| Multi-event plans schedule everything at the same time | Ignores the `EXISTING` block | The few-shot week-plan example shows distributed scheduling |
| Non-scheduling prompts become fake calendar items ("buatkan saya python script") | Prompt treated any real subject as schedulable | Rules #9-#11 require explicit scheduling intent and return `events: []` with `clarification` for coding/file/content requests |

---

## Iteration Workflow

When changing the system prompt:

1. Edit the **System Prompt** section above.
2. Run all ten few-shot examples manually (or via a test script) against the new prompt.
3. If outputs change, update the **Expected output** for any cases where the new behavior is intentionally different — explain why in a commit message.
4. If a regression appears, add it to **Known Failure Modes** and patch the prompt.
5. Bump a `PROMPT_VERSION` constant in `features/ai/prompts.ts` so we can correlate behavior changes with logs.

---

## Out of Scope (for v1)

- Conversational refinement ("move that 1 hour earlier") — handled in a separate `/api/ai/edit` flow with its own prompt, to be specified later.
- Recurring events ("every Monday at 9 AM") — Google Calendar supports this natively but our v1 schema does not; future work.
- Free/busy querying across multiple calendars — v1 reads only the user's primary calendar.
