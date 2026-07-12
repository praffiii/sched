import { CalendarSurface } from "@/features/calendar/components/CalendarSurface";
import { ChatPanel } from "@/features/chat/components/ChatPanel";
import { InspectorPanel } from "@/features/inspector/components/InspectorPanel";

export function InspectorLayout() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="grid h-full w-full grid-cols-[minmax(0,2fr)_minmax(0,3fr)] overflow-hidden">
        <InspectorPanel />
        <CalendarSurface />
      </div>
      <ChatPanel variant="drawer" />
    </div>
  );
}
