export type EventKind = "event" | "task";

export type PendingStatus = "pending" | "accepted" | "discarded";

export type GCalEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  kind?: EventKind;
  hasExplicitTime?: boolean;
};

export type AIPendingEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  kind: EventKind;
  hasExplicitTime: boolean;
  reasoning: string | null;
  status: PendingStatus;
  googleEventId: string | null;
  createdAt: string;
};
