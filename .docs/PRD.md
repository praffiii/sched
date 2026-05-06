# PRD — Sched

## Overview

Sched is a web app that lets users add tasks, deadlines, and events to Google Calendar using natural language prompts — no manual date picking, no form filling, no friction.

---

## Problem Statement

Adding a task or event to Google Calendar manually requires too many steps:

1. Open Google Calendar
2. Click the target date
3. Type the title
4. Set the time
5. Set the date
6. Save

Most people give up and keep tasks in their head, in scattered notes, or in apps they never revisit. The problem is not that people don't want to plan — it's that the act of planning is too slow and tedious.

**Sched fixes this with one prompt.**

> "Assignment Network Security, deadline Tuesday 11pm"
> → done.

---

## Target Users

- **Students** — juggling assignments, deadlines, classes, and personal goals across multiple subjects
- **Young professionals** — managing meetings, work tasks, personal commitments, and side projects

Both groups share the same core frustration: they know what they need to do, but logging it into a calendar takes too long.

Sched is built for **users around the world**. The primary target market includes Indonesia, where the product was conceived, alongside the broader global audience.

---

## Core Value Proposition

> Sched is a natural language interface for Google Calendar.
> You talk — it schedules.

Sched is **not** an AI life coach, a habit tracker, or a productivity system. It is a fast, intelligent shortcut to your calendar.

---

## Features

### Core (Must Have)


| Feature                         | Description                                                           |
| ------------------------------- | --------------------------------------------------------------------- |
| Natural language task creation  | "Assignment X due Tuesday 11pm" → creates Google Task instantly       |
| Natural language event creation | "Client meeting Friday 3pm" → creates Google Calendar Event instantly |
| Google Calendar read            | Read existing events as context for AI scheduling                     |
| Google Calendar write           | Create new events on behalf of the user                               |
| Google Tasks write              | Create tasks with deadlines                                           |
| AI pending events               | AI-generated events appear as hatched/pending until user accepts      |
| Accept / discard AI events      | User reviews and confirms before events are committed to GCal         |
| Drag to move                    | Drag AI pending events to a different time slot (before accepting)    |
| Resize to extend                | Resize AI pending events to adjust duration (before accepting)        |
| Event inspector                 | Click any AI event to see details, reasoning, and edit options        |
| Conflict indicator              | ⚠ icon on overlapping events — no blocking modal                      |


### Extended (Nice to Have)


| Feature               | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| AI week scheduling    | "Plan my week around these deadlines" → AI finds optimal slots |
| Natural language edit | "Move this 1 hour earlier" from inspector panel                |
| Conflict fix via AI   | Click ⚠ → "Fix with AI" → chat handles resolution              |


---

## Screen Flow

> Full detail in `design-flow.md`

```
Screen 1 — Auth
  1B (landing: split pitch + Google connect)
    → click "Continue with Google"
  1C (permission preview modal)
    → click "Allow & continue"
  Screen 2

Screen 2 — Main App (single screen, two states)
  2B: maximize — chat panel (left) + calendar (right)
    ↕ toggle
  2D: minimize — full calendar + floating drawer (bottom-right)

  Click any calendar event
    → inspector panel slides in from right
    → chat auto-collapses to 2D
    = Screen 3 behavior (not a separate page)

Screen 3 — Event Inspector (panel, not a page)
  Triggered by clicking an event in Screen 2
  Shows: event details, AI reasoning, accept/discard, edit input
  Drag / resize available for AI pending events only
```

---

## Google Calendar Integration Scope


| Type                           | Read | Write | AI can modify |
| ------------------------------ | ---- | ----- | ------------- |
| Google Tasks                   | ✅    | ✅     | ✅             |
| Simple Events (no guests)      | ✅    | ❌     | ❌             |
| Complex Events (guests / Meet) | ✅    | ❌     | ❌             |
| AI-generated Events (pending)  | ✅    | ✅     | ✅             |


**Rule:** Sched only creates new events — it never modifies existing Google Calendar events regardless of type. Existing events are read-only context for the AI.

---

## Out of Scope

- Apple Calendar integration
- Focus block auto-generation
- Conflict resolution UI (modal)
- Dragging or editing existing Google Calendar events
- Mobile app (web only, responsive)
- Offline mode
- Multi-calendar management (beyond default Google Calendar)
- Team / shared calendar features

---

## Success Metrics

1. **Speed** — Adding a task via Sched must be faster than adding it manually in Google Calendar. If it is not, the product fails its core promise.
2. **Return rate** — Users come back and use Sched again. Measured via web traffic and session frequency. A user who tries it once and never returns is a failed user.

---

## Design Principles

1. **Prompt first** — Every interaction starts with natural language. No forms, no dropdowns if avoidable.
2. **Calendar is always visible** — Users should always see the impact of what they're adding.
3. **AI suggests, user decides** — AI-generated events are always pending until explicitly accepted.
4. **Fast over fancy** — Speed of task creation is the core metric. No feature should slow this down.
5. **English UI, multilingual prompts** — The interface is in English, but the AI understands prompts in any language. Users can type in Bahasa Indonesia, English, or any language they prefer — Sched handles it.

