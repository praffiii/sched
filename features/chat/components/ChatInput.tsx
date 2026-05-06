"use client";

import { useState, type FormEvent } from "react";

import { SketchBtn } from "@/components/ui/SketchBtn";
import { SketchInput } from "@/components/ui/SketchInput";
import { useAppStore } from "@/store/app-store";

export function ChatInput() {
  const [value, setValue] = useState("");
  const generating = useAppStore((s) => s.generating);
  const generate = useAppStore((s) => s.generate);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const prompt = value.trim();
    if (!prompt || generating) return;
    setValue("");
    await generate(prompt);
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 border-t-2 border-ink bg-paper-warm p-3">
      <SketchInput
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ask or refine…"
        disabled={generating}
        aria-label="chat input"
      />
      <SketchBtn
        type="submit"
        variant="primary"
        disabled={generating || value.trim().length === 0}
        className="shrink-0"
      >
        {generating ? "…" : "send"}
      </SketchBtn>
    </form>
  );
}
