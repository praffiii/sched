import Link from "next/link";
import type { ReactNode } from "react";

import { SketchBox } from "@/components/ui/SketchBox";

export type LegalSection = {
  title: string;
  body: ReactNode;
};

type LegalDocumentProps = {
  title: string;
  effectiveDate: string;
  intro: ReactNode;
  sections: LegalSection[];
};

const legalLinkClass =
  "font-semibold underline decoration-2 underline-offset-4 hover:text-red";

export function LegalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a className={legalLinkClass} href={href}>
      {children}
    </a>
  );
}

export function LegalDocument({
  title,
  effectiveDate,
  intro,
  sections,
}: LegalDocumentProps) {
  return (
    <main className="relative z-10 min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/"
            className="rounded-full border-2 border-ink bg-paper px-4 py-1.5 font-semibold text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:-translate-x-[1px] hover:-translate-y-[1px]"
          >
            Sched
          </Link>
          <Link className={legalLinkClass} href="/privacy">
            Privacy
          </Link>
          <Link className={legalLinkClass} href="/terms">
            Terms
          </Link>
        </nav>

        <SketchBox shadow="card" className="p-6 sm:p-8 md:p-10">
          <p className="font-scribble text-lg font-semibold text-red">
            Last updated {effectiveDate}
          </p>
          <h1 className="mt-2 font-display text-5xl font-bold leading-none text-ink sm:text-6xl">
            {title}
          </h1>

          <div className="mt-6 border-y-2 border-dashed border-ink/25 py-5 text-lg leading-relaxed text-text-secondary">
            {intro}
          </div>

          <div className="mt-8 flex flex-col gap-7">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-3xl font-bold text-ink">
                  {section.title}
                </h2>
                <div className="mt-2 text-base leading-7 text-text-secondary">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </SketchBox>
      </div>
    </main>
  );
}
