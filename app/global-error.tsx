"use client";

import { Kalam } from "next/font/google";

import "./globals.css";

// global-error replaces the root layout, so fonts and CSS must be re-declared here
const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" className={`${kalam.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas font-hand text-ink">
        <div className="flex min-h-screen items-center justify-center p-6">
          {/* Inline sketch card — cannot use shared components here */}
          <div className="w-full max-w-sm rounded-lg border-2 border-ink bg-paper p-8 text-center shadow-[6px_6px_0_var(--color-ink)]">
            <p className="mb-4 text-4xl">✏️</p>
            <h2 className="mb-2 text-2xl font-semibold text-ink">
              Something went wrong!
            </h2>
            <p className="mb-6 text-sm text-text-secondary">
              A critical error occurred. Please refresh the page or try again.
              {error.digest && (
                <span className="mt-1 block font-mono text-xs text-text-muted">
                  ref: {error.digest}
                </span>
              )}
            </p>
            <button
              onClick={() => unstable_retry()}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink bg-yellow px-5 py-2 text-sm font-semibold text-ink shadow-[3px_3px_0_var(--color-ink)] transition-transform hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_var(--color-ink)]"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
