"use client";

import { AnnotationLabel } from "@/components/ui/AnnotationLabel";
import { SketchBtn } from "@/components/ui/SketchBtn";
import { cn } from "@/lib/utils/cn";
import { formatTimeRange } from "@/lib/utils/time";
import { useAppStore } from "@/store/app-store";
import type { ChatMessage } from "@/types/chat";
import type { AIPendingEvent } from "@/types/events";

type ChatMessageBubbleProps = {
  message: ChatMessage;
  pendingEvents: AIPendingEvent[];
};

export function ChatMessageBubble({
  message,
  pendingEvents,
}: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const acceptPending = useAppStore((s) => s.acceptPending);
  const discardPending = useAppStore((s) => s.discardPending);
  const openInspector = useAppStore((s) => s.openInspector);
  const pendingMutationIds = useAppStore((s) => s.pendingMutationIds);
  const calendarTimezone = useAppStore((s) => s.calendarTimezone);

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg border-2 border-ink px-3 py-2 font-hand text-sm text-ink shadow-[2px_2px_0_var(--color-ink)]",
          isUser ? "bg-paper-warm" : "bg-paper",
        )}
      >
        <p className="whitespace-pre-wrap leading-snug">{message.content}</p>

        {!isUser && pendingEvents.length > 0 ? (
          <div className="mt-3 space-y-2">
            <AnnotationLabel rotate={-1} className="text-xs">
              ✦ AI-pending
            </AnnotationLabel>
            {pendingEvents.map((event) => {
              const isMutating = pendingMutationIds.includes(event.id);

              return (
                <div
                  key={event.id}
                  className="hatched-pending rounded-md border-2 border-dashed border-ink px-2 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-bold">{event.title}</span>
                    <span className="shrink-0 text-[10px] text-text-secondary">
                      {event.kind === "task" && !event.hasExplicitTime
                        ? "no time"
                        : formatTimeRange(
                            event.startsAt,
                            event.endsAt,
                            calendarTimezone,
                          )}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-end gap-1">
                    <SketchBtn
                      onClick={() => openInspector(event.id)}
                      disabled={isMutating}
                      className="h-7 px-2 text-[11px]"
                    >
                      edit
                    </SketchBtn>
                    <SketchBtn
                      onClick={() => discardPending(event.id)}
                      disabled={isMutating}
                      className="h-7 px-2 text-[11px]"
                    >
                      discard
                    </SketchBtn>
                    <SketchBtn
                      variant="primary"
                      onClick={() => acceptPending(event.id)}
                      disabled={isMutating}
                      className="h-7 px-2 text-[11px]"
                    >
                      {isMutating ? "saving..." : "confirm ✓"}
                    </SketchBtn>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
