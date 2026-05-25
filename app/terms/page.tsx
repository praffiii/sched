import type { Metadata } from "next";

import {
  LegalDocument,
  LegalLink,
  type LegalSection,
} from "@/components/layouts/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service - Sched",
  description:
    "Terms for using Sched with Google login, Google Calendar, Google Tasks, and AI scheduling.",
};

const EFFECTIVE_DATE = "May 25, 2026";

const INTRO = (
  <p>
    These terms apply when you use Sched. By signing in with your Google account
    or using the app, you agree to use Sched responsibly and to review scheduling
    changes before accepting them.
  </p>
);

const SECTIONS: LegalSection[] = [
  {
    title: "Using Sched",
    body: (
      <p>
        Sched is an AI scheduling assistant for turning plain-language requests
        into draft calendar events and tasks. You are responsible for the prompts
        you submit and the scheduling changes you accept.
      </p>
    ),
  },
  {
    title: "Google account and permissions",
    body: (
      <p>
        Sched requires Google login and access to Google Calendar and Google
        Tasks to work. You can revoke Sched&apos;s Google access from your Google
        account settings at any time, though some app features may stop working.
      </p>
    ),
  },
  {
    title: "AI scheduling",
    body: (
      <p>
        AI scheduling suggestions can be incomplete, incorrect, or unsuitable
        for your needs. Review draft events and tasks before accepting them,
        especially when timing, location, attendees, or deadlines matter.
      </p>
    ),
  },
  {
    title: "Google Calendar and Google Tasks changes",
    body: (
      <p>
        Sched creates Google Calendar events and Google Tasks only after you
        accept or confirm them in the app. Existing Google Calendar events may be
        used as scheduling context, but Sched does not intentionally modify or
        delete existing calendar events.
      </p>
    ),
  },
  {
    title: "Your responsibilities",
    body: (
      <p>
        Do not use Sched to break laws, abuse Google services, interfere with
        the app, or submit information you are not allowed to use. Keep your
        Google account secure and only connect accounts you are authorized to
        use.
      </p>
    ),
  },
  {
    title: "Availability and changes",
    body: (
      <p>
        Sched is provided as is. The app may change, pause, or stop parts of the
        service, and it may not always be available or error-free.
      </p>
    ),
  },
  {
    title: "Data, privacy, and deletion",
    body: (
      <p>
        The <LegalLink href="/privacy">Privacy Policy</LegalLink> explains how
        Sched handles Google login, Calendar and Tasks data, AI scheduling data,
        Data storage, and deletion requests. You may also delete events or tasks
        directly in Google Calendar or Google Tasks.
      </p>
    ),
  },
  {
    title: "Contact",
    body: (
      <p>
        For questions about these terms or to request account deletion, contact
        the project owner through the{" "}
        <LegalLink href="https://github.com/praffiii/sched/issues">
          Sched GitHub repository
        </LegalLink>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      effectiveDate={EFFECTIVE_DATE}
      intro={INTRO}
      sections={SECTIONS}
    />
  );
}
