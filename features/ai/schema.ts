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
          reasoning: {
            type: Type.STRING,
            description: "One sentence explaining the slot choice",
          },
        },
        propertyOrdering: ["title", "startsAt", "endsAt", "kind", "reasoning"],
        required: ["title", "startsAt", "endsAt", "kind"],
      },
    },
  },
  propertyOrdering: ["events"],
  required: ["events"],
};

export type GeneratedEvent = {
  title: string;
  startsAt: string;
  endsAt: string;
  kind: "event" | "task";
  reasoning?: string;
};

export type GeneratedPayload = {
  events: GeneratedEvent[];
};
