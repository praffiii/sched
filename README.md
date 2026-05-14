# Sched

**Type what your week looks like. Sched turns it into calendar events and tasks.**

Sched is an AI scheduling assistant for Google Calendar. Instead of dragging blocks around manually, you describe what you need — meetings, tasks, deadlines, study sessions, reminders — and Sched drafts the plan for you. Review it, refine it, drag it, resize it, then commit it only when it looks right.

```txt
Type → Review draft → Refine/edit → Accept → Google Calendar / Tasks
```

## Why Sched

Calendars are great at storing plans, but bad at helping you create them.

Sched gives your calendar an intent layer:

- Say what you want in natural language.
- Let AI propose the schedule.
- See exactly what will be created before anything touches Google Calendar.
- Adjust drafts visually or with another prompt.
- Accept only when you are ready.

No black-box auto-booking. No surprise calendar changes. Just fast scheduling with human control.

## Core features

### Natural-language scheduling

Ask Sched to plan in plain language:

```txt
add tennis tomorrow at 5
schedule deep work next Monday morning
remind me to submit the assignment Friday
move this 1 hour earlier
```

Sched understands events, tasks, deadlines, explicit times, missing times, and multilingual prompts.

### AI pending drafts

AI-generated items start as **pending drafts**. They appear on the calendar, but they are not written to Google Calendar until you accept them.

You can:

- inspect the draft
- refine it with natural language
- rename it inline
- drag it to another time
- resize its duration
- discard it
- accept it

### Google Calendar + Google Tasks

Sched works with your Google account:

- calendar events become Google Calendar events
- deadline-style tasks become Google Tasks
- existing calendar events are used as read-only scheduling context

### Day, week, and month views

Switch between calendar views depending on how you think:

- **Day** — focus on one day and resize drafts precisely
- **Week** — plan across the week with drag-and-drop
- **Month** — scan the broader shape of your schedule

### Inspector workflow

Click any event or draft to open the inspector.

The inspector shows:

- event title
- time and duration
- task/event type
- AI reasoning
- conflict status
- refine input
- accept/discard actions for pending drafts

### Calendar-first browsing mode

Sched has two main work modes:

```txt
2B: chat + calendar
2D: full calendar browsing
```

When you want maximum calendar space, minimize into the full-width calendar view. Click the floating button to return to chat + calendar.

### Conflict awareness

If Sched proposes an event that overlaps existing calendar items, the calendar shows a conflict indicator. It does not block you — it keeps you in control.

### Timezone guard

Sched compares your browser timezone with your Google Calendar timezone and warns you when they differ, helping prevent confusing time shifts.

## Product flow

```txt
1. Connect Google
2. Type a scheduling request
3. Sched drafts events/tasks
4. Review on calendar
5. Refine with AI or edit visually
6. Accept to save to Google Calendar / Tasks
```

## Tech stack

- **Next.js 16** — App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Better Auth** — Google OAuth
- **Drizzle ORM**
- **Postgres**
- **Google Calendar API**
- **Google Tasks API**
- **Gemini 2.5 Flash** via `@google/genai`
- **Zustand** for client state

## Local development

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Open:

```txt
http://localhost:3000
```

## Required environment variables

Create `.env.local` with the required values for your local setup.

```txt
BETTER_AUTH_URL
BETTER_AUTH_SECRET
DATABASE_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GEMINI_API_KEY
```

Do not commit real environment values. Use `.env.example` for placeholders only.

## Scripts

```bash
pnpm dev          # start local dev server
pnpm build        # production build
pnpm start        # start production server
pnpm lint         # run ESLint
pnpm typecheck    # run TypeScript checks
pnpm db:generate  # generate Drizzle migrations
pnpm db:migrate   # run Drizzle migrations
pnpm db:studio    # open Drizzle Studio
```

Run tests:

```bash
node --test tests/*.test.mjs
```

## Project docs

The product and architecture docs live in `.docs/`:

- `.docs/PRD.md`
- `.docs/architecture.md`
- `.docs/design-flow.md`
- `.docs/design-system.md`
- `.docs/prompts.md`

`prompts.md` is the source of truth for AI scheduling behavior.

## Philosophy

Sched is not trying to replace your calendar.

It makes your calendar easier to command.

You describe intent. Sched drafts the structure. You stay in control.
