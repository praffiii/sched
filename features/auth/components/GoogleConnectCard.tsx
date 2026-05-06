"use client";

import { useState } from "react";

import { SketchBox } from "@/components/ui/SketchBox";
import { SketchBtn } from "@/components/ui/SketchBtn";
import { signIn } from "@/lib/auth-client";

import { PermissionPreview } from "./PermissionPreview";

export function GoogleConnectCard() {
  const [showModal, setShowModal] = useState(false);
  const [pending, setPending] = useState(false);

  const handleAllow = async () => {
    setPending(true);
    await signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  return (
    <>
      <div className="flex flex-col justify-center gap-6 p-10 md:p-16">
        <SketchBox shadow="card" className="p-8">
          <h2 className="font-display text-3xl font-bold text-ink">
            Connect to start
          </h2>

          <p className="mt-2 text-sm text-text-secondary">
            Sched works on top of your Google Calendar.
          </p>

          <SketchBtn
            variant="primary"
            disabled={pending}
            onClick={() => setShowModal(true)}
            className="mt-6 w-full justify-center"
          >
            <GoogleMark />
            Continue with Google
          </SketchBtn>

          <p className="mt-5 text-xs text-text-muted">
            We only see events you let us. Sign out anytime.
          </p>
        </SketchBox>
      </div>

      {showModal && (
        <PermissionPreview
          onCancel={() => setShowModal(false)}
          onAllow={handleAllow}
        />
      )}
    </>
  );
}

function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      aria-hidden
      className="shrink-0"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.4 4 9.8 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.7 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
