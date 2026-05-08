import { cn } from "@/lib/utils/cn";

import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ChatMessageList } from "./ChatMessageList";

type ChatPanelProps = {
  variant: "full" | "drawer";
  initials?: string;
};

export function ChatPanel({ variant, initials }: ChatPanelProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border-2 border-ink bg-paper",
        variant === "full"
          ? "h-full rounded-none border-y-0 border-l-0"
          : "h-[60vh] w-[360px] rounded-lg shadow-[6px_6px_0_var(--color-ink)]",
      )}
    >
      <ChatHeader variant={variant} initials={initials} />
      <ChatMessageList />
      <ChatInput />
    </div>
  );
}
