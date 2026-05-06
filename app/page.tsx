import { AnnotationLabel } from "@/components/ui/AnnotationLabel";
import { Avatar } from "@/components/ui/Avatar";
import { SketchBox } from "@/components/ui/SketchBox";
import { SketchBtn } from "@/components/ui/SketchBtn";
import { SketchInput } from "@/components/ui/SketchInput";

export default function Home() {
  return (
    <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-10 p-8">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-5xl font-bold text-ink">Sched</h1>
        <Avatar initials="PR" />
      </header>

      <section>
        <p className="text-sm text-text-secondary">
          🚧 In development — UI primitives preview. Real screens coming next.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          Sketch primitives
        </h2>

        <SketchBox shadow="card" className="p-6">
          <p className="text-base">
            This is a <strong>SketchBox</strong> with{" "}
            <code className="rounded bg-paper-warm px-1 py-0.5 text-sm">
              shadow=&quot;card&quot;
            </code>
            .
          </p>
        </SketchBox>

        <SketchBox variant="dashed" className="p-4 bg-transparent">
          <p className="text-sm text-text-secondary">
            Dashed variant — used for AI pending states.
          </p>
        </SketchBox>

        <div className="flex items-center gap-3">
          <SketchBtn variant="primary">Generate</SketchBtn>
          <SketchBtn>Cancel</SketchBtn>
          <SketchBtn disabled>Disabled</SketchBtn>
        </div>

        <div className="relative">
          <SketchInput placeholder="Type what your week looks like..." />
          <AnnotationLabel className="absolute -right-2 -top-6">
            ✦ AI input
          </AnnotationLabel>
        </div>
      </section>
    </main>
  );
}
