import { SketchBox } from "@/components/ui/SketchBox";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <SketchBox shadow="card" className="w-full max-w-sm p-8 text-center">
        <h2 className="font-display mb-2 text-2xl text-ink">Sched</h2>
        <p className="text-text-secondary mb-6 text-sm">Loading…</p>
        <div className="sketch-spinner" aria-hidden />
        <span className="sr-only">Loading</span>
      </SketchBox>
    </div>
  );
}
