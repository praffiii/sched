"use client";

import { useEffect, useMemo, useRef } from "react";

import { useAppStore } from "@/store/app-store";
import type { AIPendingEvent } from "@/types/events";

import { ChatMessageBubble } from "./ChatMessageBubble";

type ChatMessageListProps = {
  hidePendingCards?: boolean;
};

export function ChatMessageList({ hidePendingCards = false }: ChatMessageListProps) {
  const chatHistory = useAppStore((s) => s.chatHistory);
  const aiPendingEvents = useAppStore((s) => s.aiPendingEvents);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group pending events by the assistant message that introduced them.
  // Heuristic: attach pending event to the nearest preceding assistant
  // message whose createdAt <= event.createdAt. If none qualifies, skip it
  // in chat so legacy pending events remain calendar-only.
  const pendingByMessage = useMemo(() => {
    const map = new Map<string, AIPendingEvent[]>();
    const assistantMessages = chatHistory
      .filter((m) => m.role === "assistant")
      .slice()
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

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
    return map;
  }, [chatHistory, aiPendingEvents]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatHistory.length, aiPendingEvents.length]);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
      {chatHistory.length === 0 ? (
        <p className="font-hand text-sm text-text-muted">
          Type what your week looks like. We&apos;ll book it.
        </p>
      ) : (
        chatHistory.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            pendingEvents={hidePendingCards ? [] : pendingByMessage.get(message.id) ?? []}
          />
        ))
      )}
    </div>
  );
}
