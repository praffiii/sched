# CLAUDE.md — Sched

Guidance for Claude Code (and other AI assistants) working in this repository. Read this before making changes.

---

## What is Sched

A web app that turns natural-language prompts into Google Calendar events and Google Tasks. The user types what their week looks like; Gemini suggests events; the user accepts or discards them. The AI never modifies existing Google Calendar events — only creates new ones.

**Full product context:** `/.docs/PRD.md`

---

## Tech Stack (don't change without discussion)

- **Node.js 22 LTS** + **pnpm** (not Bun — Vercel runs Node in production)
- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** — design tokens in `app/globals.css` via `@theme`, no `tailwind.config.js`
- **Zustand** — global UI state (`store/app-store.ts`)
- **Better Auth** — Google OAuth, with Drizzle adapter
- **Drizzle ORM** + **Supabase Postgres** — connection via `DATABASE_URL`
- **`@google/genai`** — Gemini 2.5 Flash (NOT `@google/generative-ai`, which is deprecated)
- **`googleapis`** — Calendar + Tasks APIs
- **Vercel** — hosting

**Full architecture, schemas, and code samples:** `/.docs/architecture.md`

---

## Folder Structure (strict)

```
app/         → Next.js routes (thin — no business logic in pages)
components/
  ui/        → Reusable UI primitives, flat folder
  layouts/   → App-level shells (e.g. AppShell)
features/    → Vertical slices (auth, chat, calendar, inspector, ai)
  <feat>/components/  hooks/  api.ts
lib/         → Infrastructure: auth, db, gemini, google/ — NO React imports
store/       → Zustand global store
types/       → Shared TS types
```

### Rules
1. **`app/` is thin.** Pages compose features; no business logic in `page.tsx`.
2. **Features cannot import from each other.** If two features need the same code, lift it to `components/ui/` (UI) or `lib/` (logic).
3. **`lib/` has no React imports.** It's pure infrastructure.
4. **Promotion:** A component starts inside its feature's `components/`. The moment a 2nd feature needs it, move it to `components/ui/`.

---

## Design System (strict)

Sketchy/handwritten aesthetic. All tokens defined in `app/globals.css` via `@theme`. **Do not introduce ad-hoc colors, fonts, or shadows** — use the tokens.

- Borders are bold (`2px solid var(--color-ink)`), shadows are offset with no blur (`3px 3px 0 var(--color-ink)`).
- Fonts: `--font-hand` (Kalam) for body, `--font-display` (Caveat) for logo/headings, `--font-scribble` for annotations.
- AI pending events use a hatched diagonal pattern; accepted events use solid `--color-green-teal`; existing GCal events use solid `--color-yellow`.

**Full design system:** `/.docs/design-system.md`
**Screen flow / UI states:** `/.docs/design-flow.md`

---

## Hard Constraints (from PRD)

- **Never modify existing Google Calendar events.** Sched only creates new ones. Existing events are read-only context for the AI.
- **AI suggestions must be pending until user accepts.** Never write to Google Calendar before the user clicks Accept.
- **English UI, multilingual prompts.** Interface text is English. The AI must understand prompts in any language (Bahasa Indonesia, English, etc.) and emit ISO 8601 timestamps regardless of input language.
- **No conflict resolution modal.** Conflicts surface as a `⚠` icon on the event chip; resolution happens via AI chat in the 2D drawer.
- **Two UI states only:** `2B` (chat panel + calendar split) and `2D` (full calendar + floating chat drawer). Toggling preserves all state. Clicking an event opens the inspector panel and auto-collapses chat to 2D.

---

## Conventions

- **TypeScript strict mode.** No `any` unless unavoidable.
- **Async/await** over `.then()` chains.
- **Server-only code** (DB queries, API calls with secrets) goes in `app/api/*` route handlers or `lib/` with `import "server-only"` at the top where appropriate.
- **Imports:** absolute paths via the configured `@/` alias.
- **Components:** PascalCase files (`SketchBox.tsx`). Hooks: `use*` camelCase (`useChat.ts`).

---

## Environment Variables

See `.env.example` (when added). Required in dev:

```
DATABASE_URL          # Supabase pooler URL (port 6543)
GEMINI_API_KEY        # Google AI Studio
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
BETTER_AUTH_SECRET    # openssl rand -base64 32
BETTER_AUTH_URL       # http://localhost:3000 in dev
```

---

## When Asking About Libraries

If unsure about current API/syntax for any library above, use **Context7 MCP** (`resolve-library-id` → `query-docs`). The stack moves fast — verify before relying on training-data knowledge. Tailwind v4 and `@google/genai` in particular are recent enough that older patterns will be wrong.

---

## Documents Index

- `/.docs/PRD.md` — Product requirements, target users, success metrics, scope
- `/.docs/architecture.md` — Stack, folder structure, data model, auth/AI flows, env, deployment
- `/.docs/design-system.md` — Colors, typography, components, CSS variables, paper texture
- `/.docs/design-flow.md` — Screen flows, UI states (2B / 2D / inspector), state architecture
- `/.docs/prompts.md` — Gemini system prompt, user message template, few-shot test cases, failure modes

---

## Cursor Cloud specific instructions

Durable, non-obvious notes for future cloud agents. Standard commands live in `README.md` / `package.json` scripts — use those; only the caveats below are non-obvious.

### Services & how to run them

Single service: the Next.js app (App Router + API route handlers). Run it in dev with `pnpm dev` (Turbopack, port 3000). Standard scripts are in `package.json` (`lint`, `typecheck`, `build`, `db:*`).

### Local Postgres (dev DB)

- There is no managed Supabase DB in the cloud VM. A local PostgreSQL 16 cluster stands in for it, and `.env.local` points `DATABASE_URL` at `postgresql://postgres:postgres@127.0.0.1:5432/sched`.
- Postgres is NOT auto-started on boot. Start it each session before running the app or migrations: `sudo pg_ctlcluster 16 main start`.
- `.env.local` is gitignored and persists via the VM snapshot (not the update script). If it is ever missing, recreate it with the local `DATABASE_URL` above plus a `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL=http://localhost:3000`.
- `drizzle-kit` does NOT read `.env.local`. Migration commands need `DATABASE_URL` exported inline, e.g. `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/sched pnpm db:migrate`. `next dev` DOES load `.env.local` automatically.
- Verify DB + app wiring end-to-end with `curl localhost:3000/api/health` → expect `{"status":"ok","db":"ok",...}`.

### Tests

- Run with `node --experimental-strip-types --test tests/*.test.mjs`. The flag is required: several `.test.mjs` files import `.ts` modules directly, and Node 22 (this VM) only strips TS types behind that flag (it is on by default only on Node 23.6+). The bare `node --test tests/*.test.mjs` from the README fails on `.ts` imports here.
- Tests are content/behavior assertions and do NOT need the database running.

### Secrets & Google OAuth (full E2E flow)

Cloud-injected secrets (`GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) land in the **shell environment**, not automatically in `.env.local`. Next.js dev reads `.env.local` only — after secrets are added, sync them into `.env.local` and **restart `pnpm dev`**.

The core flow (Google login → prompt → Gemini drafts → accept into Google Calendar/Tasks) requires all three secrets plus a Google test account. `GEMINI_API_KEY` can be smoke-tested independently (see `lib/gemini.ts`).

**OAuth redirect URI (common E2E blocker):** Better Auth sends exactly:

```txt
http://localhost:3000/api/auth/callback/google
```

This must be listed under **Authorized redirect URIs** on the **same** OAuth 2.0 Web client whose Client ID matches `GOOGLE_CLIENT_ID`. A `400 redirect_uri_mismatch` from Google means the console entry is missing, typo'd, or belongs to a different client. Confirm the live URI with:

```bash
curl -s -X POST http://localhost:3000/api/auth/sign-in/social \
  -H "Content-Type: application/json" \
  -d '{"provider":"google","callbackURL":"/"}' | python3 -c "import sys,json,urllib.parse; u=json.load(sys.stdin)['url']; print(dict(urllib.parse.parse_qsl(urllib.parse.urlparse(u).query))['redirect_uri'])"
```

Expected output: `http://localhost:3000/api/auth/callback/google`
