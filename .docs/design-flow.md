# Design Flow — Sched

## Overview

Sched has three logical screens. Screen 3 is not a separate page — it is a panel state within Screen 2. There are no page navigations after login except the initial auth flow.

```
Screen 1 (Auth) → Screen 2 (Main App)
                        ↕ panel states
                  Screen 3 (Inspector panel)
```

---

## Screen 1 — Authentication

### Variants

| Variant | Status | Role |
|---|---|---|
| 1A centered card | ❌ Removed | — |
| 1B split pitch + connect | ✅ Active | Landing page |
| 1C permission preview | ✅ Active | Post-click modal |

### Layout — 1B (Landing)

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│  Sched                  │  Connect to start    │
│                         │                      │
│  "Type what your        │  [G] Continue        │
│   week looks like.      │      with Google     │
│   We'll book it."       │                      │
│                         │  "We only see        │
│  [✦ AI events]          │   events you         │
│  [↔ Drag to edit]       │   let us."           │
│  [⟲ Routines]           │                      │
│                         │                      │
└─────────────────────────┴──────────────────────┘
```

- Right panel: Google Calendar only — Apple Calendar removed
- Left panel: pitch / value proposition
- No sign-up form, no email/password

### Layout — 1C (Permission Modal)

Appears as overlay on top of 1B after clicking "Continue with Google".

```
┌─────────────────────────────┐
│  [G avatar] you@gmail.com   │
│                             │
│  Sched wants to:            │
│  ─────────────────────────  │
│  [✓] See your calendars     │
│      Read events & free/busy│
│  ─────────────────────────  │
│  [✓] Create events          │
│      Add AI-generated blocks│
│  ─────────────────────────  │
│  [✓] Edit events            │
│      When you drag/refine   │
│                             │
│  [Cancel]  [Allow & continue]│
└─────────────────────────────┘
```

### Flow

```
1B
  ↓ click "Continue with Google"
1C modal overlay
  ↓ click "Allow & continue"
Screen 2 (2B state)
  ↓ click "Cancel"
Back to 1B (no auth)
```

---

## Screen 2 — Main App

Single screen with two UI states. **State never resets when toggling** — chat history, calendar events, and AI pending events are all preserved in parent state.

### States

| | 2B — Maximize | 2D — Minimize |
|---|---|---|
| Chat panel | Full left panel (~40% width) | Floating drawer (bottom-right) |
| Calendar | Right side (~60% width) | Full width (100%) |
| Conversation history | Fully visible | Visible in drawer |
| Context | ✅ Full | ✅ Full |

### Layout — 2B (Maximize)

```
┌────────────────┬──────────────────────────────┐
│                │                              │
│  Sched    [A]  │  May 4–10   ◀ today ▶        │
│  ──────────── │  [day] [week] [month]        │
│                │                              │
│  User: add     │  Mon  Tue  Wed  Thu  Fri ... │
│  task X...     │  ┌──┐ ┌──┐ ┌──┐             │
│                │  │  │ │▨▨│ │  │             │
│  AI: Done —    │  └──┘ └──┘ └──┘             │
│  Tue 21-23 ✓   │                              │
│  [edit][confirm]                              │
│                │                              │
│  [ask or       │                              │
│   refine...]   │                              │
└────────────────┴──────────────────────────────┘
              [_] minimize
```

### Layout — 2D (Minimize)

```
┌──────────────────────────────────────────────┐
│                                              │
│  May 4–10   ◀ today ▶                        │
│  [day] [week] [month]                        │
│                                              │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun           │
│  ┌──┐ ┌──┐ ┌──┐                              │
│  │  │ │▨▨│ │  │                              │
│  └──┘ └──┘ └──┘                 ┌──────────┐ │
│                                 │ ✦ Sched  │ │
│                                 │ ──────── │ │
│                                 │ AI: Done │ │
│                                 │ Tue 21-23│ │
│                                 │ [input]  │ │
│                                 └──────────┘ │
└──────────────────────────────────────────────┘
                                  [↑] maximize
```

### Toggle Behavior

```
2B → click [minimize]
  chat panel slides out to the left
  calendar expands to full width
  drawer appears bottom-right with same context
  → 2D

2D → click [maximize]
  drawer collapses
  chat panel slides in from left
  calendar shrinks to ~60% width
  all chat history still visible
  → 2B
```

### State Architecture

```
Parent state (never resets):
  ├── uiMode: "2B" | "2D" | "inspector"
  ├── chatHistory: Message[]
  ├── calendarEvents: GCalEvent[]        ← from Google Calendar API
  └── aiPendingEvents: AIPendingEvent[]  ← local, not yet in GCal
```

---

## Screen 3 — Event Inspector

Not a separate page. Triggered by clicking any event on the calendar. Inspector panel slides in from the right.

### Trigger

```
User clicks any calendar event (existing or AI pending)
  ↓
Inspector panel slides in from right (~260px)
Chat panel auto-collapses to 2D
uiMode → "inspector"
```

### Layout — Inspector Open

```
┌──────────────────────────┬───────────────┐
│                          │ ✦ AI-pending  │
│   [full calendar]        │ ────────────  │
│                          │ Task Name     │
│   ⚠ on conflict events   │ Tue 21–23 · 2h│
│                          │               │
│              ┌─────────┐ │ why this?     │
│              │ ✦ Sched │ │ ┌───────────┐ │
│              │ drawer  │ │ │ reasoning │ │
│              └─────────┘ │ └───────────┘ │
│                          │               │
│                          │ [↔ drag]      │
│                          │ [⤢ resize]    │
│                          │ [input field] │
│                          │               │
│                          │ [discard][✓]  │
└──────────────────────────┴───────────────┘
```

### Inspector Content

| Element | Description |
|---|---|
| Status badge | "✦ AI-generated · pending" or "existing event" |
| Title | Event name |
| Time | Start – End · duration |
| Why this slot? | AI reasoning (AI pending events only) |
| Drag affordance | ↔ drag to move (AI pending only) |
| Resize affordance | ⤢ resize to extend (AI pending only) |
| Natural language input | e.g. "move 1h earlier" |
| Actions | [discard] [accept ✓] (AI pending only) |

### Drag & Resize Scope

| Action | AI Pending Events | Existing GCal Events |
|---|---|---|
| Drag to move | ✅ Before accepting | ❌ |
| Resize to extend | ✅ Before accepting | ❌ |

Dragging or resizing updates local state only. Changes are committed to Google Calendar only when user clicks **accept ✓**.

### Conflict Indicator

- Overlapping events show a **⚠ icon** on the event chip in the calendar grid
- No blocking modal — calendar stays fully interactive
- User clicks conflicting event → inspector opens → "Fix with AI →" button
- AI handles resolution via chat in the 2D drawer

### Close Inspector

```
User clicks ✕ on inspector panel
  ↓
Inspector slides out to the right
uiMode returns to previous state (2B or 2D)
Calendar returns to its previous width
```

---

## Removed Variants & Features

| Item | Reason |
|---|---|
| Screen 2A (hero prompt) | Redundant — user goes directly to 2B after login |
| Screen 2C (calendar + ⌘K bar) | Removed for simplicity — 2B/2D covers all cases |
| Apple Calendar integration | Out of scope |
| Conflict resolution modal | Replaced by ⚠ indicator + AI chat fix |
| Focus block auto-generation | Not part of core problem |
| Drag existing GCal events | Too risky — potential data inconsistency with GCal |
