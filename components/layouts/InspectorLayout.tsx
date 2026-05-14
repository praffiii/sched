import { CalendarSurface } from "@/features/calendar/components/CalendarSurface";
import { InspectorPanel } from "@/features/inspector/components/InspectorPanel";

export function InspectorLayout() {
  return (
    <div className="grid h-screen w-full grid-cols-[minmax(0,2fr)_minmax(0,3fr)] overflow-hidden">
      <InspectorPanel />
      <CalendarSurface />
    </div>
  );
}
