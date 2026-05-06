import { CalendarSurface } from "@/features/calendar/components/CalendarSurface";
import { ChatPanel } from "@/features/chat/components/ChatPanel";

export function TwoDLayout() {
  return (
    <div className="relative h-screen w-full">
      <CalendarSurface />
      <div className="fixed bottom-4 right-4 z-20">
        <ChatPanel variant="drawer" />
      </div>
    </div>
  );
}
