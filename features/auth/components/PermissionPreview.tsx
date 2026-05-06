"use client";

import { useEffect } from "react";

import { SketchBox } from "@/components/ui/SketchBox";
import { SketchBtn } from "@/components/ui/SketchBtn";

type Permission = {
  title: string;
  detail: string;
};

const PERMISSIONS: Permission[] = [
  { title: "See your calendars", detail: "Read events & free/busy" },
  { title: "Create events", detail: "Add AI-generated blocks" },
  { title: "Edit events", detail: "When you drag/refine before accepting" },
];

type PermissionPreviewProps = {
  onCancel: () => void;
  onAllow: () => void;
};

export function PermissionPreview({ onCancel, onAllow }: PermissionPreviewProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      onClick={onCancel}
    >
      <SketchBox
        shadow="card"
        className="w-full max-w-md p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-2xl font-bold text-ink">
          Sched wants to:
        </p>

        <ul className="mt-5 flex flex-col gap-4">
          {PERMISSIONS.map((p) => (
            <li
              key={p.title}
              className="flex gap-3 border-b-2 border-dashed border-ink/30 pb-3 last:border-0 last:pb-0"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-yellow text-xs font-bold">
                ✓
              </span>
              <div>
                <p className="font-semibold text-ink">{p.title}</p>
                <p className="text-sm text-text-secondary">{p.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end gap-3">
          <SketchBtn onClick={onCancel}>Cancel</SketchBtn>
          <SketchBtn variant="primary" onClick={onAllow}>
            Allow &amp; continue
          </SketchBtn>
        </div>
      </SketchBox>
    </div>
  );
}
