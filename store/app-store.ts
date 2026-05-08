import { create } from "zustand";

import type { ChatMessage } from "@/types/chat";
import type { AIPendingEvent, GCalEvent } from "@/types/events";
import type { UIMode } from "@/types/ui";

type GenerateResponse = {
  pendingEvents: AIPendingEvent[];
  assistantMessage: ChatMessage;
  userMessage: ChatMessage;
};

interface AppState {
  uiMode: UIMode;
  selectedEventId: string | null;

  chatHistory: ChatMessage[];
  calendarEvents: GCalEvent[];
  aiPendingEvents: AIPendingEvent[];

  hydrated: boolean;
  generating: boolean;

  setUIMode: (m: UIMode) => void;
  openInspector: (eventId: string) => void;
  closeInspector: () => void;

  appendMessage: (m: ChatMessage) => void;
  upsertPendingEvent: (e: AIPendingEvent) => void;

  hydrate: () => Promise<void>;
  generate: (prompt: string) => Promise<GenerateResponse | null>;
  acceptPending: (id: string) => Promise<void>;
  discardPending: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  uiMode: "2B",
  selectedEventId: null,
  chatHistory: [],
  calendarEvents: [],
  aiPendingEvents: [],
  hydrated: false,
  generating: false,

  setUIMode: (m) => set({ uiMode: m }),

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
    const events = eventsRes.ok
      ? ((await eventsRes.json()).events as GCalEvent[])
      : [];
    const pending = pendingRes.ok
      ? ((await pendingRes.json()).pendingEvents as AIPendingEvent[])
      : [];

    set({
      chatHistory: history,
      calendarEvents: events,
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
      }));
      return data;
    } finally {
      set({ generating: false });
    }
  },

  acceptPending: async (id) => {
    // TODO B.4: POST /api/calendar/events, then PATCH /api/ai/pending/:id status='accepted'
    void id;
  },

  discardPending: async (id) => {
    // TODO B.4: PATCH /api/ai/pending/:id status='discarded'
    void id;
  },
}));
