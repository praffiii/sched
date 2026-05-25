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

function getInitialDrawerPos(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;

  const saved = readSavedPos();
  const defaultPos = getDefaultPos();
  return clampPos(
    saved?.x ?? defaultPos.x,
    saved?.y ?? defaultPos.y,
    window.innerHeight * 0.6,
  );
}

export function ChatPanel({ variant, initials }: ChatPanelProps) {
  if (variant === "drawer") {
    return <DrawerChatPanel />;
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border-2 border-ink bg-paper",
        "h-full rounded-none border-y-0 border-l-0",
      )}
    >
      <ChatHeader variant="full" initials={initials} />
      <ChatMessageList />
      <ChatInput />
    </div>
  );
}

function DrawerChatPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(getInitialDrawerPos);
  const dragState = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({ active: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });

  // Clamp on resize
  useEffect(() => {
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
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
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
    [pos],
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

  const style: React.CSSProperties = {
    position: "fixed",
    left: pos?.x ?? MARGIN,
    top: pos?.y ?? undefined,
    bottom: pos ? undefined : MARGIN,
    zIndex: 20,
    width: PANEL_WIDTH,
  };

  return (
    <div
      ref={panelRef}
      style={style}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border-2 border-ink bg-paper",
        "h-[60vh] rounded-lg shadow-[6px_6px_0_var(--color-ink)]",
      )}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <ChatHeader
        variant="drawer"
        onPointerDown={onPointerDown}
      />
      <ChatMessageList />
      <ChatInput />
    </div>
  );
}
