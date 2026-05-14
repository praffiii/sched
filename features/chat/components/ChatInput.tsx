"use client";

import { useState, type FormEvent } from "react";

import { SketchBtn } from "@/components/ui/SketchBtn";
import { SketchInput } from "@/components/ui/SketchInput";
import { useAppStore } from "@/store/app-store";

type ChatInputProps = {
  onSubmitPrompt?: (prompt: string) => Promise<void> | void;
  placeholder?: string;
};

export function ChatInput({
  onSubmitPrompt,
  placeholder = "ask or refine…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const generating = useAppStore((s) => s.generating);
  const generate = useAppStore((s) => s.generate);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const prompt = value.trim();
    if (!prompt || generating) return;
    setValue("");
    if (onSubmitPrompt) {
      await onSubmitPrompt(prompt);
    } else {
      await generate(prompt);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 border-t-2 border-ink bg-paper-warm p-3">
      <SketchInput
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
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
