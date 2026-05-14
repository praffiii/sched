"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";

import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ChatMessageList } from "./ChatMessageList";

type ChatPanelProps = {
  variant: "full" | "drawer";
  initials?: string;
};

const STORAGE_KEY = "sched:chat-drawer-pos";
const MARGIN = 16;
const PANEL_WIDTH = 360;

function getDefaultPos(): { x: number; y: number } {
  return {
    x: MARGIN,
    y: Math.max(MARGIN, Math.round(window.innerHeight * 0.4) - MARGIN),
  };
}

function clampPos(
  x: number,
  y: number,
  panelHeight: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(x, window.innerWidth - PANEL_WIDTH - MARGIN)),
    y: Math.max(0, Math.min(y, window.innerHeight - panelHeight - MARGIN)),
  };
}

function readSavedPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x: number; y: number };
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      !Number.isNaN(parsed.x) &&
      !Number.isNaN(parsed.y)
    ) {
      return parsed;
    }
  } catch {
    /* ignore corrupted storage */
  }
  return null;
}

function writeSavedPos(pos: { x: number; y: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* ignore storage errors */
  }
}

export function ChatPanel({ variant, initials }: ChatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({ active: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const isDrawer = variant === "drawer";

  // Initialize position on mount
  useEffect(() => {
    if (!isDrawer) return;
    const saved = readSavedPos();
    const defaultPos = getDefaultPos();
    const panelHeight = panelRef.current?.getBoundingClientRect().height ??
      window.innerHeight * 0.6;
    setPos(clampPos(saved?.x ?? defaultPos.x, saved?.y ?? defaultPos.y, panelHeight));
  }, [isDrawer]);

  // Clamp on resize
  useEffect(() => {
    if (!isDrawer) return;
    const onResize = () => {
      setPos((prev) => {
        if (!prev) return prev;
        const panelHeight = panelRef.current?.getBoundingClientRect().height ??
          window.innerHeight * 0.6;
        return clampPos(prev.x, prev.y, panelHeight);
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isDrawer]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDrawer) return;
      const el = panelRef.current;
      if (!el) return;

      // Only drag from the header; ignore buttons/inputs inside it
      const target = e.target as HTMLElement;
      if (target.closest("button, input, a, [role='button']")) return;

      e.preventDefault();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

      dragState.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        initialX: pos?.x ?? 0,
        initialY: pos?.y ?? 0,
      };
    },
    [isDrawer, pos],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current.active) return;
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      const panelHeight = panelRef.current?.getBoundingClientRect().height ??
        window.innerHeight * 0.6;
      setPos(
        clampPos(
          dragState.current.initialX + dx,
          dragState.current.initialY + dy,
          panelHeight,
        ),
      );
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    setPos((prev) => {
      if (prev) writeSavedPos(prev);
      return prev;
    });
  }, []);

  const style: React.CSSProperties = isDrawer
    ? { position: "fixed", left: pos?.x ?? MARGIN, top: pos?.y ?? undefined, bottom: pos ? undefined : MARGIN, zIndex: 20, width: PANEL_WIDTH }
    : {};

  return (
    <div
      ref={panelRef}
      style={style}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border-2 border-ink bg-paper",
        variant === "full"
          ? "h-full rounded-none border-y-0 border-l-0"
          : "h-[60vh] rounded-lg shadow-[6px_6px_0_var(--color-ink)]",
      )}
      onPointerMove={isDrawer ? onPointerMove : undefined}
      onPointerUp={isDrawer ? onPointerUp : undefined}
    >
      <ChatHeader
        variant={variant}
        initials={initials}
        onPointerDown={isDrawer ? onPointerDown : undefined}
      />
      <ChatMessageList />
      <ChatInput />
    </div>
  );
}
