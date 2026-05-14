"use client";

import { useEffect } from "react";

import { Toast } from "@/components/ui/Toast";
import { useAppStore } from "@/store/app-store";

import { InspectorLayout } from "./InspectorLayout";
import { TwoBLayout } from "./TwoBLayout";
import { TwoDLayout } from "./TwoDLayout";

type AppShellProps = {
  initials?: string;
};

export function AppShell({ initials }: AppShellProps) {
  const uiMode = useAppStore((s) => s.uiMode);
  const hydrated = useAppStore((s) => s.hydrated);
  const uiRestored = useAppStore((s) => s.uiRestored);
  const restoreUIState = useAppStore((s) => s.restoreUIState);
  const hydrate = useAppStore((s) => s.hydrate);

  useEffect(() => {
    if (!uiRestored) restoreUIState();
    if (!hydrated) {
      void hydrate();
    }
  }, [hydrated, hydrate, restoreUIState, uiRestored]);

  if (!uiRestored) {
    return <div className="h-screen w-full bg-paper" />;
  }

  if (uiMode === "2B") {
    return (
      <>
        <TwoBLayout initials={initials} />
        <Toast />
      </>
    );
  }
  if (uiMode === "inspector") {
    return (
      <>
        <InspectorLayout />
        <Toast />
      </>
    );
  }
  return (
    <>
      <TwoDLayout />
      <Toast />
    </>
  );
}
