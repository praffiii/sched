import { Type } from "@google/genai";

export const eventSchema = {
  type: Type.OBJECT,
  properties: {
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          startsAt: {
            type: Type.STRING,
            description: "ISO 8601 with local timezone offset",
          },
          endsAt: {
            type: Type.STRING,
            description: "ISO 8601 with local timezone offset",
          },
          kind: {
            type: Type.STRING,
            enum: ["event", "task"],
            description: "'event' = time block, 'task' = deadline moment",
          },
          hasExplicitTime: {
            type: Type.BOOLEAN,
            description:
              "True only when the user explicitly mentioned a time of day such as 9am, 13:00, pagi jam 9, malam jam 8. False when only a date/day/deadline is mentioned.",
          },
          reasoning: {
            type: Type.STRING,
            description: "One sentence explaining the slot choice",
          },
        },
        propertyOrdering: [
          "title",
          "startsAt",
          "endsAt",
          "kind",
          "hasExplicitTime",
          "reasoning",
        ],
        required: ["title", "startsAt", "endsAt", "kind", "hasExplicitTime"],
      },
    },
    clarification: {
      type: Type.STRING,
      description:
        "Set ONLY when the prompt is too ambiguous to schedule. A short question in the user's language asking for the missing info. When set, `events` MUST be empty.",
    },
  },
  propertyOrdering: ["events", "clarification"],
  required: ["events"],
};

export type GeneratedEvent = {
  title: string;
  startsAt: string;
  endsAt: string;
  kind: "event" | "task";
  hasExplicitTime: boolean;
  reasoning?: string;
};

export type GeneratedPayload = {
  events: GeneratedEvent[];
  clarification?: string;
};
