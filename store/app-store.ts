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
};

interface AppState {
  uiMode: UIMode;
  selectedEventId: string | null;
  calendarAnchorAt: string;

  chatHistory: ChatMessage[];
  calendarEvents: GCalEvent[];
  aiPendingEvents: AIPendingEvent[];
  calendarTimezone: string;

  hydrated: boolean;
  generating: boolean;
  pendingMutationIds: string[];

  toast: string | null;

  setUIMode: (m: UIMode) => void;
  setCalendarAnchor: (date: Date) => void;
  openInspector: (eventId: string) => void;
  closeInspector: () => void;

  appendMessage: (m: ChatMessage) => void;
  upsertPendingEvent: (e: AIPendingEvent) => void;

  hydrate: () => Promise<void>;
  generate: (prompt: string) => Promise<GenerateResponse | null>;
  acceptPending: (id: string) => Promise<void>;
  discardPending: (id: string) => Promise<void>;

  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  uiMode: "2B",
  selectedEventId: null,
  calendarAnchorAt: new Date().toISOString(),
  chatHistory: [],
  calendarEvents: [],
  aiPendingEvents: [],
  calendarTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  hydrated: false,
  generating: false,
  pendingMutationIds: [],
  toast: null,

  setUIMode: (m) => set({ uiMode: m }),

  setCalendarAnchor: (date) => set({ calendarAnchorAt: date.toISOString() }),

  openInspector: (eventId) =>
    set({ uiMode: "inspector", selectedEventId: eventId }),

  closeInspector: () => set({ uiMode: "2D", selectedEventId: null }),

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
    const [historyRes, eventsRes, pendingRes] = await Promise.all([
      fetch("/api/chat/history"),
      fetch("/api/calendar/events"),
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

    set({
      chatHistory: history,
      calendarEvents: eventsPayload.events,
      calendarTimezone: eventsPayload.timezone ?? get().calendarTimezone,
      aiPendingEvents: pending,
      hydrated: true,
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
        calendarAnchorAt: data.pendingEvents[0]?.startsAt ?? s.calendarAnchorAt,
      }));
      return data;
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
        pending.kind === "task" && !pending.hasExplicitTime
          ? "/api/tasks"
          : "/api/calendar/events";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingEventId: id }),
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
        calendarAnchorAt: acceptedEvent.startsAt,
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
