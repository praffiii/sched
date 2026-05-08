"use client";

import { useEffect } from "react";

import { useAppStore } from "@/store/app-store";

import { TwoBLayout } from "./TwoBLayout";
import { TwoDLayout } from "./TwoDLayout";

type AppShellProps = {
  initials?: string;
};

export function AppShell({ initials }: AppShellProps) {
  const uiMode = useAppStore((s) => s.uiMode);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);

  useEffect(() => {
    if (!hydrated) {
      void hydrate();
    }
  }, [hydrated, hydrate]);

  if (uiMode === "2B") {
    return <TwoBLayout initials={initials} />;
  }
  return <TwoDLayout />;
}
