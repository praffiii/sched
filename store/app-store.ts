import { create } from "zustand";

import type { ChatMessage } from "@/types/chat";
import type { AIPendingEvent, GCalEvent } from "@/types/events";
import type { UIMode } from "@/types/ui";

type GenerateResponse = {
  pendingEvents: AIPendingEvent[];
  assistantMessage: ChatMessage;
  userMessage: ChatMessage;
  timezone?: string;
};

type AcceptCalendarResponse = {
  event: GCalEvent;
};

type AcceptTaskResponse = {
  taskEvent: GCalEvent;
};

type CalendarEventsResponse = {
  events: GCalEvent[];
  timezone?: string;
  googleTimezone?: string;
};

type PendingDraftUpdate = Partial<
  Pick<
    AIPendingEvent,
    "title" | "startsAt" | "endsAt" | "kind" | "hasExplicitTime" | "reasoning"
  >
>;

type PendingUpdateResponse = {
  pendingEvent: AIPendingEvent;
};

type RefinePendingResponse = {
  pendingEvent: AIPendingEvent;
  assistantMessage: ChatMessage;
  userMessage: ChatMessage;
  timezone?: string;
};

const UI_MODE_STORAGE_KEY = "sched:ui-mode";

function readSavedUIMode(): UIMode | null {
  try {
    const raw = localStorage.getItem(UI_MODE_STORAGE_KEY);
    if (raw === "2B" || raw === "2D") return raw;
  } catch {
    /* ignore storage errors */
  }
  return null;
}

function writeSavedUIMode(mode: UIMode) {
  if (mode !== "2B" && mode !== "2D") return;
  try {
    localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore storage errors */
  }
}

function calendarDayAnchorIso(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  if (!year || !month || !day) return iso;

  // Noon avoids midnight timezone edge cases when CalendarSurface computes
  // the containing local week using Date methods.
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

interface AppState {
  uiMode: UIMode;
  previousUIMode: UIMode;
  selectedEventId: string | null;
  calendarAnchorAt: string;

  chatHistory: ChatMessage[];
  calendarEvents: GCalEvent[];
  aiPendingEvents: AIPendingEvent[];
  calendarTimezone: string;

  hydrated: boolean;
  uiRestored: boolean;
  generating: boolean;
  pendingMutationIds: string[];

  toast: string | null;

  setUIMode: (m: UIMode) => void;
  setCalendarAnchor: (date: Date) => void;
  openInspector: (eventId: string) => void;
  closeInspector: () => void;

  appendMessage: (m: ChatMessage) => void;
  upsertPendingEvent: (e: AIPendingEvent) => void;

  restoreUIState: () => void;
  hydrate: () => Promise<void>;
  generate: (prompt: string) => Promise<GenerateResponse | null>;
  updatePendingDraft: (id: string, patch: PendingDraftUpdate) => Promise<void>;
  refinePending: (id: string, instruction: string) => Promise<void>;
  acceptPending: (id: string) => Promise<void>;
  discardPending: (id: string) => Promise<void>;

  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  uiMode: "2B",
  previousUIMode: "2D",
  selectedEventId: null,
  calendarAnchorAt: new Date().toISOString(),
  chatHistory: [],
  calendarEvents: [],
  aiPendingEvents: [],
  calendarTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  hydrated: false,
  uiRestored: false,
  generating: false,
  pendingMutationIds: [],
  toast: null,

  setUIMode: (m) => {
    writeSavedUIMode(m);
    set({ uiMode: m });
  },

  restoreUIState: () => {
    const savedUIMode = readSavedUIMode();
    set({
      uiMode: savedUIMode ?? "2B",
      previousUIMode: savedUIMode ?? "2D",
      uiRestored: true,
    });
  },

  setCalendarAnchor: (date) => set({ calendarAnchorAt: date.toISOString() }),

  openInspector: (eventId) =>
    set((s) => {
      const event =
        s.aiPendingEvents.find((pending) => pending.id === eventId) ??
        s.calendarEvents.find((calendarEvent) => calendarEvent.id === eventId);

      return {
        previousUIMode: s.uiMode === "inspector" ? s.previousUIMode : s.uiMode,
        uiMode: "inspector",
        selectedEventId: eventId,
        calendarAnchorAt: event
          ? calendarDayAnchorIso(event.startsAt, s.calendarTimezone)
          : s.calendarAnchorAt,
      };
    }),

  closeInspector: () =>
    set((s) => ({
      uiMode: s.previousUIMode === "inspector" ? "2D" : s.previousUIMode,
      selectedEventId: null,
    })),

  appendMessage: (m) =>
    set((s) => ({ chatHistory: [...s.chatHistory, m] })),

  upsertPendingEvent: (e) =>
    set((s) => {
      const idx = s.aiPendingEvents.findIndex((p) => p.id === e.id);
      if (idx === -1) return { aiPendingEvents: [...s.aiPendingEvents, e] };
      const next = s.aiPendingEvents.slice();
      next[idx] = e;
      return { aiPendingEvents: next };
    }),

  hydrate: async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [historyRes, eventsRes, pendingRes] = await Promise.all([
      fetch("/api/chat/history"),
      fetch("/api/calendar/events", {
        headers: { "x-client-timezone": timezone },
      }),
      fetch("/api/ai/pending"),
    ]);

    const history = historyRes.ok
      ? ((await historyRes.json()).messages as ChatMessage[])
      : [];
    const eventsPayload = eventsRes.ok
      ? ((await eventsRes.json()) as CalendarEventsResponse)
      : { events: [] };
    const pending = pendingRes.ok
      ? ((await pendingRes.json()).pendingEvents as AIPendingEvent[])
      : [];

    const googleTimezone = eventsPayload.googleTimezone;
    const timezoneMismatch =
      typeof googleTimezone === "string" &&
      googleTimezone.length > 0 &&
      googleTimezone !== timezone;

    // Always use the browser timezone for display. Google Calendar web can be
    // configured to a different timezone than the user's active device; when it
    // is, the same event will appear at different wall-clock times in Google UI.
    set({
      chatHistory: history,
      calendarEvents: eventsPayload.events,
      calendarTimezone: timezone,
      aiPendingEvents: pending,
      hydrated: true,
      toast: timezoneMismatch
        ? `Google Calendar web uses ${googleTimezone}; this device uses ${timezone}. Match them to avoid time shifts.`
        : get().toast,
    });
  },

  generate: async (prompt) => {
    if (get().generating) return null;
    set({ generating: true });
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, timezone }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[store.generate] failed", text);

        // Surface a transient error as an in-memory chat exchange so the
        // user sees their prompt + an explanation instead of a silent clear.
        // Not persisted to DB — these messages disappear on next hydrate.
        let transient = res.status === 503;
        try {
          const parsed = JSON.parse(text) as { transient?: boolean };
          if (typeof parsed.transient === "boolean") transient = parsed.transient;
        } catch {
          /* ignore non-JSON error bodies */
        }

        const errorContent = transient
          ? "Sched belum bisa merespons sekarang — model sedang sibuk. Coba lagi sebentar."
          : "Sched gagal memproses prompt ini. Coba lagi atau sederhanakan permintaannya.";

        const ts = new Date();
        const localUserMessage: ChatMessage = {
          id: `local-user-${crypto.randomUUID()}`,
          role: "user",
          content: prompt,
          createdAt: ts.toISOString(),
        };
        const localAssistantMessage: ChatMessage = {
          id: `local-error-${crypto.randomUUID()}`,
          role: "assistant",
          content: errorContent,
          createdAt: new Date(ts.getTime() + 1).toISOString(),
        };
        set((s) => ({
          chatHistory: [...s.chatHistory, localUserMessage, localAssistantMessage],
        }));
        return null;
      }
      const data = (await res.json()) as GenerateResponse;
      set((s) => ({
        chatHistory: [...s.chatHistory, data.userMessage, data.assistantMessage],
        aiPendingEvents: [...s.aiPendingEvents, ...data.pendingEvents],
        calendarTimezone: data.timezone ?? s.calendarTimezone,
        calendarAnchorAt: data.pendingEvents[0]
          ? calendarDayAnchorIso(
              data.pendingEvents[0].startsAt,
              data.timezone ?? s.calendarTimezone,
            )
          : s.calendarAnchorAt,
      }));
      return data;
    } finally {
      set({ generating: false });
    }
  },

  updatePendingDraft: async (id, patch) => {
    const pending = get().aiPendingEvents.find((event) => event.id === id);
    if (!pending) return;

    const optimistic: AIPendingEvent = { ...pending, ...patch };
    set((s) => ({
      aiPendingEvents: s.aiPendingEvents.map((event) =>
        event.id === id ? optimistic : event,
      ),
      calendarAnchorAt: patch.startsAt
        ? calendarDayAnchorIso(patch.startsAt, s.calendarTimezone)
        : s.calendarAnchorAt,
    }));

    const res = await fetch(`/api/ai/pending/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[store.updatePendingDraft] failed", text);
      let toast = "Failed to update draft — try again.";
      try {
        const p = JSON.parse(text) as { error?: string };
        if (p.error) toast = p.error;
      } catch { /* ignore */ }
      set((s) => ({
        toast,
        aiPendingEvents: s.aiPendingEvents.map((event) =>
          event.id === id ? pending : event,
        ),
      }));
      return;
    }

    const data = (await res.json()) as PendingUpdateResponse;
    set((s) => ({
      aiPendingEvents: s.aiPendingEvents.map((event) =>
        event.id === id ? data.pendingEvent : event,
      ),
      calendarAnchorAt: calendarDayAnchorIso(
        data.pendingEvent.startsAt,
        s.calendarTimezone,
      ),
    }));
  },

  refinePending: async (id, instruction) => {
    const pending = get().aiPendingEvents.find((event) => event.id === id);
    if (!pending || get().generating) return;

    set({ generating: true });
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/ai/pending/${id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, timezone }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[store.refinePending] failed", text);
        let toast = "Failed to refine draft — try again.";
        try {
          const p = JSON.parse(text) as { error?: string };
          if (p.error) toast = p.error;
        } catch { /* ignore */ }
        set({ toast });
        return;
      }

      const data = (await res.json()) as RefinePendingResponse;
      set((s) => ({
        chatHistory: [...s.chatHistory, data.userMessage, data.assistantMessage],
        aiPendingEvents: s.aiPendingEvents.map((event) =>
          event.id === id ? data.pendingEvent : event,
        ),
        calendarTimezone: data.timezone ?? s.calendarTimezone,
        calendarAnchorAt: calendarDayAnchorIso(
          data.pendingEvent.startsAt,
          data.timezone ?? s.calendarTimezone,
        ),
      }));
    } finally {
      set({ generating: false });
    }
  },

  acceptPending: async (id) => {
    const pending = get().aiPendingEvents.find((event) => event.id === id);
    if (!pending || get().pendingMutationIds.includes(id)) return;

    set((s) => ({ pendingMutationIds: [...s.pendingMutationIds, id] }));
    try {
      const endpoint =
        pending.kind === "task" ? "/api/tasks" : "/api/calendar/events";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingEventId: id,
          timezone: get().calendarTimezone,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[store.acceptPending] failed", text);
        let toast = "Failed to save — try again.";
        try {
          const p = JSON.parse(text) as { error?: string };
          if (p.error) toast = p.error;
        } catch { /* ignore */ }
        set({ toast });
        return;
      }

      const createsCalendarEvent =
        pending.kind === "event" || pending.hasExplicitTime;
      const acceptedEvent = createsCalendarEvent
        ? ((await res.json()) as AcceptCalendarResponse).event
        : ((await res.json()) as AcceptTaskResponse).taskEvent;

      set((s) => ({
        aiPendingEvents: s.aiPendingEvents.filter((event) => event.id !== id),
        calendarEvents: [...s.calendarEvents, acceptedEvent],
        calendarAnchorAt: calendarDayAnchorIso(
          acceptedEvent.startsAt,
          s.calendarTimezone,
        ),
        ...(s.selectedEventId === id
          ? {
              uiMode: s.previousUIMode === "inspector" ? "2D" : s.previousUIMode,
              selectedEventId: null,
            }
          : {}),
      }));
    } finally {
      set((s) => ({
        pendingMutationIds: s.pendingMutationIds.filter(
          (pendingId) => pendingId !== id,
        ),
      }));
    }
  },

  showToast: (message) => set({ toast: message }),

  clearToast: () => set({ toast: null }),

  discardPending: async (id) => {
    const pending = get().aiPendingEvents.find((event) => event.id === id);
    if (!pending || get().pendingMutationIds.includes(id)) return;

    set((s) => ({ pendingMutationIds: [...s.pendingMutationIds, id] }));
    try {
      const res = await fetch(`/api/ai/pending/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "discarded" }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[store.discardPending] failed", text);
        let toast = "Failed to discard — try again.";
        try {
          const p = JSON.parse(text) as { error?: string };
          if (p.error) toast = p.error;
        } catch { /* ignore */ }
        set({ toast });
        return;
      }

      set((s) => ({
        aiPendingEvents: s.aiPendingEvents.filter((event) => event.id !== id),
        ...(s.selectedEventId === id
          ? {
              uiMode: s.previousUIMode === "inspector" ? "2D" : s.previousUIMode,
              selectedEventId: null,
            }
          : {}),
      }));
    } finally {
      set((s) => ({
        pendingMutationIds: s.pendingMutationIds.filter(
          (pendingId) => pendingId !== id,
        ),
      }));
    }
  },
}));
