import { CalendarSurface } from "@/features/calendar/components/CalendarSurface";
import { ChatPanel } from "@/features/chat/components/ChatPanel";

export function TwoDLayout() {
  return (
    <div className="relative h-screen w-full">
      <CalendarSurface />
      <ChatPanel variant="drawer" />
    </div>
  );
}
