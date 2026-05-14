import { CalendarSurface } from "@/features/calendar/components/CalendarSurface";
import { ToggleModeButton } from "@/features/chat/components/ToggleModeButton";

export function TwoDLayout() {
  return (
    <div className="relative h-screen w-full">
      <CalendarSurface />
      <div className="fixed bottom-4 right-4 z-20">
        <ToggleModeButton />
      </div>
    </div>
  );
}
