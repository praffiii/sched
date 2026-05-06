import { AnnotationLabel } from "@/components/ui/AnnotationLabel";

export function PitchPanel() {
  return (
    <div className="flex flex-col justify-center gap-10 p-10 md:p-16">
      <h1 className="font-display text-7xl font-bold leading-none text-ink">
        Sched
      </h1>

      <p className="font-hand text-3xl leading-snug text-ink">
        &ldquo;Type what your week looks like.
        <br />
        We&apos;ll book it.&rdquo;
      </p>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <AnnotationLabel rotate={-3}>✦ AI events</AnnotationLabel>
        <AnnotationLabel rotate={1}>↔ Drag to edit</AnnotationLabel>
        <AnnotationLabel rotate={-1}>⟲ Routines</AnnotationLabel>
      </div>
    </div>
  );
}
