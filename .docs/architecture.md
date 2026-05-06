# Architecture — Sched

## 1. Overview

Sched is a full-stack web app built on **Next.js 16 (App Router)**. The frontend is a React single-page app (post-login) styled with the sketchy/handwritten design system. The backend is a set of Next.js Route Handlers that authenticate users via **Better Auth (Google OAuth)**, generate event suggestions with **Google Gemini 2.5 Flash**, and read/write the user's calendar via the **Google Calendar + Tasks APIs**. State persists in **Postgres on Supabase** via **Drizzle ORM**. Hosted on **Vercel**.

Versions and setup details below were verified against current docs via Context7.

---

## 2. Tech Stack

| Layer | Choice | Package |
|---|---|---|
| Framework | Next.js 16 (App Router) | `next@^16.2` — requires Node 20.9+, TypeScript 5.1+ |
| Language | TypeScript | `typescript@^5.5` |
| Styling | Tailwind CSS v4 | `tailwindcss@^4` — config via `@theme` in CSS, no JS config file |
| State | Zustand | `zustand@^5.0` |
| AI | Google Gemini 2.5 Flash | `@google/genai` (the new SDK; `@google/generative-ai` is deprecated) |
| Auth | Better Auth | `better-auth` + `@better-auth/drizzle-adapter` |
| Database | Supabase (managed Postgres) | Hosted Postgres + dashboard GUI. Connection via `DATABASE_URL`. **Not** using Supabase Auth or `@supabase/supabase-js`. |
| ORM | Drizzle | `drizzle-orm` + `postgres` (postgres-js driver) + `drizzle-kit` (dev) |
| Google APIs | googleapis | `googleapis` npm package — Calendar + Tasks |
| Hosting | Vercel | — |
| Runtime | Node.js 22 LTS | Minimum: Node 20.9 (per Next.js 16). 22 LTS recommended. |
| Package manager | pnpm | `pnpm@^9` — fast, disk-efficient, used by the Next.js team's own examples. |

**Critical setup notes:**

- **Gemini SDK**: Use `@google/genai` (`import { GoogleGenAI, Type } from '@google/genai'`). The older `@google/generative-ai` is deprecated and should not be used in new projects.
- **Tailwind v4**: There is no `tailwind.config.js`. All design tokens are defined in CSS via `@theme { ... }` (see §5).
- **Better Auth + Google**: Must set `accessType: "offline"` and `prompt: "select_account consent"` to reliably receive a refresh token. Google only issues refresh tokens on first consent unless these are set.

### Runtime / package manager rationale

We use **Node.js 22 LTS + pnpm**, not Bun, even though Bun is faster locally. Vercel runs Next.js serverless functions on Node — using Bun in development risks subtle production differences (Bun-only globals, native-binding edge cases). pnpm gives us most of Bun's install speed without the runtime mismatch, and Next.js 16 + Turbopack already provides Bun-level dev-server speed.

### Standard package.json scripts

```
pnpm dev          # next dev (Turbopack)
pnpm build        # next build
pnpm start        # next start
pnpm db:generate  # drizzle-kit generate
pnpm db:migrate   # drizzle-kit migrate
pnpm db:studio    # drizzle-kit studio (local DB inspector)
pnpm lint         # next lint
pnpm typecheck    # tsc --noEmit
```

---

## 3. Project Structure

Two-tier UI (`components/ui/` for primitives + `components/layouts/` for app shells) plus feature modules in `features/`. This is the dominant Next.js convention used by Cal.com, Linear, and most modern shadcn-based stacks.

```
sched/
├── app/                              # Next.js App Router — ROUTES ONLY (thin)
│   ├── (auth)/
│   │   └── login/
│   │       ├── page.tsx              # Screen 1B landing
│   │       └── permission-modal.tsx  # Screen 1C (route-local)
│   ├── api/
│   │   ├── auth/[...all]/route.ts    # Better Auth catch-all
│   │   ├── ai/generate/route.ts      # POST: prompt → Gemini → AI pending events
│   │   ├── calendar/events/route.ts  # GET list, POST write accepted event
│   │   ├── tasks/route.ts            # POST: create Google Task
│   │   └── chat/history/route.ts     # GET chat history
│   ├── layout.tsx                    # Fonts, paper texture, providers
│   ├── globals.css                   # @theme tokens (see §5)
│   └── page.tsx                      # Screen 2 — composes feature modules
│
├── components/                        # SHARED UI — reusable across features
│   ├── ui/                           # Flat collection of UI primitives
│   │   ├── SketchBox.tsx
│   │   ├── SketchBtn.tsx
│   │   ├── SketchInput.tsx
│   │   ├── Avatar.tsx
│   │   ├── IconBadge.tsx
│   │   ├── EventChip.tsx
│   │   ├── PromptInput.tsx
│   │   └── AnnotationLabel.tsx
│   └── layouts/                      # App-level shell components
│       └── AppShell.tsx              # Manages 2B/2D/inspector layout switching
│
├── features/                          # VERTICAL SLICES — feature modules
│   ├── auth/
│   │   ├── components/               # GoogleConnectCard, PermissionPreview
│   │   ├── hooks/                    # useSession
│   │   └── api.ts                    # client-side fetchers
│   ├── chat/
│   │   ├── components/               # ChatPanel (2B), ChatDrawer (2D), ChatMessageBubble
│   │   ├── hooks/                    # useChat
│   │   └── api.ts
│   ├── calendar/
│   │   ├── components/               # CalendarGrid, CalendarHeader, EventBlock, ConflictIcon
│   │   ├── hooks/                    # useCalendarEvents
│   │   └── api.ts
│   ├── inspector/
│   │   ├── components/               # InspectorPanel, InspectorActions, ReasoningBlock, DragHandle
│   │   ├── hooks/                    # useInspector, useDragResize
│   │   └── api.ts
│   └── ai/
│       ├── hooks/                    # useGenerate
│       ├── prompts.ts                # buildPrompt, system message
│       └── schema.ts                 # Gemini responseJsonSchema
│
├── lib/                               # CROSS-CUTTING infrastructure (no React)
│   ├── auth.ts                       # Better Auth server config
│   ├── auth-client.ts                # Better Auth client SDK
│   ├── db/
│   │   ├── index.ts                  # drizzle client
│   │   └── schema.ts                 # users, sessions, accounts, chat_messages, ai_pending_events
│   ├── gemini.ts                     # GoogleGenAI singleton
│   ├── google/
│   │   ├── oauth.ts                  # Refresh-token-aware OAuth2 client factory
│   │   ├── calendar.ts               # googleapis Calendar wrapper
│   │   └── tasks.ts                  # googleapis Tasks wrapper
│   └── utils/
│       ├── date.ts
│       └── cn.ts                     # className merger
│
├── store/                             # Zustand global store
│   └── app-store.ts                  # uiMode, chatHistory, calendarEvents, aiPendingEvents
│
├── types/                             # Shared TypeScript types
│   ├── events.ts                     # GCalEvent, AIPendingEvent
│   ├── chat.ts                       # ChatMessage
│   └── ui.ts                         # UIMode
│
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
└── .env.local                        # see §11
```

### Architectural rules

1. **`app/` is thin.** Pages compose feature modules — no business logic in `page.tsx`.
2. **`components/ui/` = pure, reusable UI primitives.** Flat folder. No feature-specific logic, no API calls, no Zustand reads. If a component is used by 2+ features, it belongs here.
3. **`components/layouts/` = app-level scaffolds.** `AppShell` and similar components that wrap multiple features together.
4. **`features/` = vertical slices.** Each feature owns its components, hooks, and API client. Features can import from `components/` (UI primitives) and `lib/` (infrastructure), but **NOT from each other**. Cross-feature dependencies are a signal to lift code into `components/ui/` or `lib/`.
5. **`lib/` = framework-level infrastructure.** Auth, DB, AI client, Google APIs. No React imports allowed.
6. **`store/` = global app state only.** UI state local to a feature stays in that feature's hooks.
7. **`types/` = shared contracts** between server and client, or between 2+ features.

**Promotion rule:** A component starts inside its feature's `components/`. The moment a second feature needs it, lift it to `components/ui/` (if it's a primitive) or extract a shared module under `lib/` (if it has logic).

---

## 4. Data Model (Drizzle Schema)

Tables:

- **users / sessions / accounts / verifications** — managed by Better Auth. The `accounts` table stores Google `accessToken`, `refreshToken`, `accessTokenExpiresAt`, and `scope` per user. We read these to authorize Calendar/Tasks API calls.
- **chat_messages** — `id`, `userId`, `role` (`'user' | 'assistant'`), `content`, `createdAt`
- **ai_pending_events** — `id`, `userId`, `title`, `startsAt`, `endsAt`, `reasoning`, `status` (`'pending' | 'accepted' | 'discarded'`), `googleEventId` (nullable; set when accepted), `createdAt`

**Source-of-truth rule:** Accepted events are NOT mirrored in our DB after creation — Google Calendar is the source of truth (per PRD). We keep `googleEventId` on the pending row only to allow the UI to dedupe between local AI events and the events we re-fetch from Google.

---

## 5. Design Tokens in Tailwind v4

`app/globals.css`:

```css
@import "tailwindcss";

@theme {
  /* Typography */
  --font-hand: "Kalam", "Patrick Hand", system-ui, sans-serif;
  --font-display: "Caveat", cursive;
  --font-scribble: "Caveat", "Shadows Into Light", cursive;

  /* Base */
  --color-paper: #FFFCF2;
  --color-paper-warm: #F5EFD9;
  --color-canvas: #EDE7D3;
  --color-ink: #1a1a1a;

  /* Accent */
  --color-yellow: #FFD93D;
  --color-red: #FF6B6B;
  --color-green-teal: #B8E0D2;

  /* Text */
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #555555;
  --color-text-muted: #888888;
  --color-text-disabled: #cccccc;

  /* Sketch shadows (offset, no blur) */
  --shadow-sketch-btn: 3px 3px 0 #1a1a1a;
  --shadow-sketch-card: 6px 6px 0 #1a1a1a;
}
```

Fonts loaded in `app/layout.tsx` via `next/font/google` (Kalam, Caveat, Shadows Into Light). Paper texture applied as `body::before` per `design-system.md`.

---

## 6. Auth Flow (Better Auth + Google)

```ts
// lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  database: drizzleAdapter(db, { provider: "pg" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessType: "offline",
      prompt: "select_account consent",
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/tasks",
      ],
    },
  },
});
```

A catch-all route handler at `app/api/auth/[...all]/route.ts` exports `auth.handler` for GET and POST.

**Calling Google APIs server-side:** read the user's `accounts.accessToken` from the DB, refresh it via `accounts.refreshToken` if expired, then pass the valid token to a `googleapis` `OAuth2` client. This is encapsulated in `lib/google/oauth.ts`.

---

## 7. AI Generation Flow

Request shape — `POST /api/ai/generate`:

```json
{ "prompt": "Assignment Network Security, deadline Tuesday 11pm" }
```

Server steps:

1. Authenticate the session via Better Auth.
2. Fetch the user's last 7 days + next 14 days of GCal events as scheduling context.
3. Call Gemini 2.5 Flash with `responseMimeType: "application/json"` and a strict `responseJsonSchema`.
4. Persist the returned events as rows in `ai_pending_events` (status = `pending`).
5. Append the user prompt and AI response to `chat_messages`.
6. Return the new pending events to the client.

Gemini call:

```ts
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const eventSchema = {
  type: Type.OBJECT,
  properties: {
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title:     { type: Type.STRING },
          startsAt:  { type: Type.STRING, description: "ISO 8601" },
          endsAt:    { type: Type.STRING, description: "ISO 8601" },
          kind:      { type: Type.STRING, description: "'event' | 'task'" },
          reasoning: { type: Type.STRING },
        },
        propertyOrdering: ["title", "startsAt", "endsAt", "kind", "reasoning"],
        required: ["title", "startsAt", "endsAt", "kind"],
      },
    },
  },
  propertyOrdering: ["events"],
  required: ["events"],
};

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: buildPrompt(userPrompt, calendarContext),
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: eventSchema,
  },
});

const { events } = JSON.parse(response.text);
```

**System prompt instructions** to the model (`features/ai/prompts.ts`):
- Respond in the user's language for the chat content (English, Bahasa Indonesia, etc.) but always emit ISO 8601 timestamps regardless of input language.
- Never modify or reference modifying existing GCal events — those are read-only context.
- If proposed events overlap existing GCal events, surface the conflict in `reasoning`.

---

## 8. Accept / Discard

- **Accept** → `POST /api/calendar/events` (or `/api/tasks` if `kind === 'task'`) → write to Google → on success, update the `ai_pending_events` row to `status = 'accepted'` and persist `googleEventId`.
- **Discard** → `PATCH` the row to `status = 'discarded'`. No Google call.

Per PRD: existing GCal events are NEVER modified by Sched — they are read-only context.

---

## 9. Client State (Zustand)

```ts
// store/app-store.ts
type UIMode = "2B" | "2D" | "inspector";

interface AppState {
  uiMode: UIMode;
  selectedEventId: string | null;
  chatHistory: ChatMessage[];
  calendarEvents: GCalEvent[];        // hydrated from /api/calendar/events
  aiPendingEvents: AIPendingEvent[];  // hydrated from DB on mount

  setUIMode: (m: UIMode) => void;
  openInspector: (eventId: string) => void;  // sets uiMode='inspector', auto-collapses chat
  closeInspector: () => void;

  // chat / pending mutations
  appendMessage: (m: ChatMessage) => void;
  upsertPendingEvent: (e: AIPendingEvent) => void;
  acceptPending: (id: string) => Promise<void>;
  discardPending: (id: string) => Promise<void>;
}
```

**Hydration:** on app mount, fetch `/api/chat/history`, `/api/calendar/events`, and `/api/ai/pending` in parallel. The store is the single source of truth for the UI; components read via selectors.

---

## 10. Drag & Resize (AI Pending Only)

Drag and resize mutate the Zustand store immediately (optimistic). Changes are debounced (~500ms after drag end) and persisted to the DB via `PATCH /api/ai/pending/:id`. They are **never** pushed to Google until the user clicks Accept. Existing GCal events have drag/resize disabled at the component level (the handles are rendered conditionally on `event.kind === 'pending'`).

---

## 11. Environment Variables

```
DATABASE_URL=                # Supabase Postgres pooler URL (port 6543) for serverless
GEMINI_API_KEY=              # Google AI Studio
GOOGLE_CLIENT_ID=            # Google Cloud OAuth client
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_SECRET=          # generate via `openssl rand -base64 32`
BETTER_AUTH_URL=             # http://localhost:3000 in dev
```

Google Cloud project setup:
- Enable **Google Calendar API** and **Google Tasks API**.
- OAuth consent screen scopes: `calendar`, `tasks`, `openid`, `email`, `profile`.
- Authorized redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/google`.

---

## 12. Deployment

- Vercel project linked to the repo (auto-deploys on push to `main`).
- Env vars set in Vercel dashboard for **Preview** + **Production**.
- Supabase project provides `DATABASE_URL`. Use the **pooler** connection string (port 6543) for serverless compatibility — direct connections (port 5432) will exhaust the pool under Vercel's concurrency model.
- Drizzle migrations: run `pnpm db:generate` locally, commit the migration SQL, then `pnpm db:migrate` runs in CI before deploy (or manually for v1).

---

## 13. Out of Scope (Reaffirmed from PRD)

- Apple Calendar integration
- Focus block auto-generation
- Conflict resolution modal (replaced by ⚠ indicator + AI chat fix)
- Modifying existing Google Calendar events
- Native mobile app (web only, responsive)
- Offline mode
- Multi-calendar management beyond the user's default Google Calendar
- Team / shared calendar features
