# Plan — Phase B.3 Bug Fix Round 2

Branch: `feat/phase-b3-screen-2b` (PR #3, masih open).
Lint + build harus tetap lulus (`pnpm lint && pnpm build`).

## Context

PR #3 (Screen 2B) sudah landed dua commit fix sebelumnya, tapi dua issue masih tersisa setelah manual testing:

1. **Bug grouping pending event di chat** — pending events lama (yang `createdAt`-nya dari sebelum fix timestamp) selalu nempel ke assistant message terbaru. Akibat user-visible: chip "Bayar listrik" muncul ulang di setiap exchange chat baru, termasuk di error/clarification message.
2. **Chip kalender clickable tapi inspector belum ada** — klik chip set `uiMode="inspector"` lalu AppShell fallback ke `<TwoDLayout />`, tidak ada panel inspector yang dirender. Confusing UX. Per `.docs/design-flow.md:169-225`, click chip adalah entry point utama ke Inspector (Screen 3), tapi inspector panel di-defer ke phase B.5.

## Fix #1 — Grouping default di ChatMessageList

**File:** `features/chat/components/ChatMessageList.tsx`

**Bug saat ini (line ~21-39):**
```ts
for (const event of aiPendingEvents) {
  const eventTime = new Date(event.createdAt).getTime();
  let target = assistantMessages[assistantMessages.length - 1]; // ← default = LATEST
  for (const msg of assistantMessages) {
    if (new Date(msg.createdAt).getTime() <= eventTime) target = msg;
  }
  if (!target) continue;
  ...
}
```

Untuk pending event lama yang `createdAt`-nya lebih awal dari semua assistant messages saat ini, loop tidak menemukan match dan `target` tetap = LATEST assistant message → event lama nempel salah.

**Fix:** Ganti default jadi `null`. Event yang tidak punya assistant message dengan `createdAt <= event.createdAt` → skip (event tetap muncul di kalender, tapi tidak di chat).

```ts
for (const event of aiPendingEvents) {
  const eventTime = new Date(event.createdAt).getTime();
  let target: (typeof assistantMessages)[number] | null = null;
  for (const msg of assistantMessages) {
    if (new Date(msg.createdAt).getTime() <= eventTime) target = msg;
  }
  if (!target) continue;
  const list = map.get(target.id) ?? [];
  list.push(event);
  map.set(target.id, list);
}
```

Hanya 2 baris yang berubah (deklarasi `target` + tipe annotation). Sisanya identik.

## Fix #2 — Disable klik chip di B.3

**Alasan:** inspector panel belum ada (defer ke B.5). Element clickable yang tidak melakukan apa-apa = bingung user. Lebih jujur: chip visual-only sampai inspector landing.

Roadmap setelah ini (untuk konteks, jangan diimplement di plan ini):
- **B.4:** wire `acceptPending` / `discardPending` di store + tombol di ChatMessageBubble (sekarang stub no-op)
- **B.5:** inspector panel slide-in + drag/resize + re-enable chip click

**File:** `features/calendar/components/EventChip.tsx`

**Yang perlu diubah:**

1. Hapus `useAppStore` import dan `openInspector` selector (tidak dipakai lagi).
2. Ganti `<button onClick={...}>` jadi `<div>` (atau `<div role="presentation">`). Hilangkan props/styles button-specific:
   - Hapus `type="button"`
   - Hapus `onClick`
   - Hapus `transition-transform hover:-translate-x-[1px] hover:-translate-y-[1px]` (no hover state untuk non-interactive element)
3. Tambahkan `cursor-default` agar pointer tidak misleading.
4. Tetap render isi chip apa adanya (title, time, conflict icon).

**Sample shape akhir:**
```tsx
import { cn } from "@/lib/utils/cn";
import { formatTimeRange } from "@/lib/utils/time";
import type { AIPendingEvent, GCalEvent } from "@/types/events";

import { ConflictIcon } from "./ConflictIcon";

type EventChipProps = {
  event: GCalEvent | AIPendingEvent;
  kind: "gcal" | "pending";
  hasConflict: boolean;
  top: number;
  height: number;
  lane: number;
  totalLanes: number;
};

const GAP_PX = 2;

export function EventChip({
  event,
  kind,
  hasConflict,
  top,
  height,
  lane,
  totalLanes,
}: EventChipProps) {
  const widthPct = 100 / totalLanes;
  const leftPct = lane * widthPct;
  const isCompact = height < 36;

  return (
    <div
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - ${GAP_PX * 2}px)`,
      }}
      className={cn(
        "absolute z-10 cursor-default select-none overflow-hidden rounded-md border-2 border-ink text-left text-[11px] font-bold leading-tight text-ink shadow-[2px_2px_0_var(--color-ink)]",
        isCompact ? "px-1.5 py-0.5" : "px-2 py-1",
        kind === "gcal" && "bg-yellow",
        kind === "pending" && "hatched-pending border-dashed",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="truncate font-hand">{event.title}</span>
        {hasConflict ? <ConflictIcon className="shrink-0" /> : null}
      </div>
      {!isCompact ? (
        <div className="mt-0.5 truncate font-hand text-[10px] font-normal text-text-secondary">
          {formatTimeRange(event.startsAt, event.endsAt)}
        </div>
      ) : null}
    </div>
  );
}
```

Note: `useAppStore` jadi unused setelah perubahan ini — hapus juga import-nya.

## Verifikasi

1. **`pnpm lint && pnpm build` lulus.** Tidak ada warning untuk unused import.
2. **Fix #1:** Reload app. Pending events lama yang `createdAt`-nya dari sebelum fix tidak lagi muncul di chat — hanya di kalender. Generate prompt baru → assistant bubble menampilkan event yang baru di-generate saja, tidak ada event lama nempel. Generate prompt off-topic ("buatkan file html biasa") → AI return clarification, bubble tampil teks pertanyaan saja, tanpa event card.
3. **Fix #2:** Klik chip mana saja di kalender → tidak ada perubahan state, tidak ada efek hover translate, kursor tetap default, layout tidak switch ke 2D. Chip terlihat sebagai info-only.
4. **Tidak break existing:** generate event biasa → chip muncul di kalender dengan style yang sama (hatched untuk pending, solid yellow untuk gcal). Conflict badge tetap muncul saat ada overlap. Compact mode (chip < 36px) tetap drop time row.

## Commit

Single commit di branch yang sama (`feat/phase-b3-screen-2b`):

```
fix(b3): drop stale events from chat; make chips info-only

Fix #1 — Old pending events kept attaching to the latest assistant
message because the grouping default fell through to "latest" when no
assistant message qualified. Default to null instead so legacy events
(with createdAt before any current chat message) are simply omitted
from chat. They remain visible on the calendar.

Fix #2 — Chip click triggered openInspector(), but the inspector
panel is deferred to phase B.5. Confusing UX. Render chips as a div
with cursor-default until the inspector lands.

Files:
- features/chat/components/ChatMessageList.tsx
- features/calendar/components/EventChip.tsx
```

Push ke `feat/phase-b3-screen-2b` (PR #3 auto-update). Tidak perlu PR baru.

## Out of scope (jangan di-implement di plan ini)

- Membersihkan pending events lama dari DB (perlu migration / admin endpoint).
- Menambahkan visual distinction event vs task di chip.
- Implementasi inspector panel (itu B.5).
- Wire accept/discard buttons (itu B.4).
- Tombol toggle 2B/2D (sudah ada di header chat).
