import { CalendarSurface } from "@/features/calendar/components/CalendarSurface";
import { ChatPanel } from "@/features/chat/components/ChatPanel";

type TwoBLayoutProps = {
  initials?: string;
};

export function TwoBLayout({ initials }: TwoBLayoutProps) {
  return (
    <div className="grid h-screen w-full grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ChatPanel variant="full" initials={initials} />
      <CalendarSurface />
    </div>
  );
}
