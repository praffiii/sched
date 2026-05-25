import type { Metadata } from "next";

import {
  LegalDocument,
  LegalLink,
  type LegalSection,
} from "@/components/layouts/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy - Sched",
  description:
    "How Sched uses Google login, Google Calendar, Google Tasks, AI scheduling, and stored app data.",
};

const EFFECTIVE_DATE = "May 25, 2026";

const INTRO = (
  <p>
    Sched helps you turn natural-language scheduling requests into draft Google
    Calendar events and Google Tasks. This policy explains what Sched collects,
    how it uses that information, and how to request deletion.
  </p>
);

const SECTIONS: LegalSection[] = [
  {
    title: "Google login",
    body: (
      <p>
        Sched uses Google login to create and secure your account. When you sign
        in, Sched may receive your Google account identifier, name, email
        address, profile image, and login session details.
      </p>
    ),
  },
  {
    title: "Google Calendar and Google Tasks access",
    body: (
      <p>
        Sched requests Google Calendar access to read calendar context, calendar
        timezone details, and existing events, and to create calendar events you
        accept. Sched requests Google Tasks access to read task context and
        create tasks you accept. Sched does not intentionally modify or delete
        your existing Google Calendar events.
      </p>
    ),
  },
  {
    title: "AI scheduling",
    body: (
      <p>
        When you ask Sched to plan something, Sched may send your prompt,
        relevant calendar and task context, timezone information, and draft
        details to an AI provider to generate or refine scheduling suggestions.
        AI scheduling output stays pending until you review and accept it.
      </p>
    ),
  },
  {
    title: "Data storage",
    body: (
      <p>
        Sched stores app data needed to run the service, including account
        profile fields, email address, sessions, OAuth tokens needed to keep
        Google access working, chat messages, pending AI drafts, accepted or
        discarded draft records, and timestamps.
      </p>
    ),
  },
  {
    title: "Sharing and service providers",
    body: (
      <p>
        Sched uses service providers for hosting, database storage,
        authentication, AI processing, and Google Calendar and Google Tasks API
        access. Sched does not sell your personal data.
      </p>
    ),
  },
  {
    title: "Google API data",
    body: (
      <p>
        Sched&apos;s use and transfer of information received from Google APIs
        will adhere to the{" "}
        <LegalLink href="https://developers.google.com/terms/api-services-user-data-policy">
          Google API Services User Data Policy
        </LegalLink>
        , including the Limited Use requirements.
      </p>
    ),
  },
  {
    title: "Deletion",
    body: (
      <p>
        You can request deletion of your Sched account and stored app data by
        using the contact method below. Deletion removes Sched account records,
        sessions, OAuth tokens, chat history, and pending drafts from Sched.
        Events or tasks already created in Google Calendar or Google Tasks are
        not deleted from Google; manage those in your Google account.
      </p>
    ),
  },
  {
    title: "Contact",
    body: (
      <p>
        For privacy questions or deletion requests, contact the project owner
        through the{" "}
        <LegalLink href="https://github.com/praffiii/sched/issues">
          Sched GitHub repository
        </LegalLink>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      effectiveDate={EFFECTIVE_DATE}
      intro={INTRO}
      sections={SECTIONS}
    />
  );
}
