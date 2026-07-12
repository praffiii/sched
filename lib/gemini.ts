import "server-only";

import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-2.5-flash" as const;

export const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY as string,
});
