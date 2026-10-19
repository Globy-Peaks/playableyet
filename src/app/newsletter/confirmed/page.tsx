import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Digest confirmation",
  robots: { index: false, follow: false },
};

export default function ConfirmedPage({ searchParams }: PageProps<"/newsletter/confirmed">) {
  return (
    <Suspense fallback={<Shell title="Confirming…" body="Checking that confirmation link." />}>
      <Confirmed searchParams={searchParams} />
    </Suspense>
  );
}

async function Confirmed({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; unsub?: string }>;
}) {
  const { status, unsub } = await searchParams;
  const unsubToken = status === "mail" && isUnsubscribeToken(unsub) ? unsub : null;
  const copy = messageFor(status, Boolean(unsubToken));
  return (
    <Shell title={copy.title} body={copy.body}>
      {unsubToken ? (
        <p className="mt-3 text-sm leading-6">
          <Link
            href={`/api/newsletter/unsubscribe?token=${encodeURIComponent(unsubToken)}`}
            className="underline decoration-primary/60 underline-offset-4"
          >
            Unsubscribe
          </Link>
        </p>
      ) : null}
    </Shell>
  );
}

function isUnsubscribeToken(value: string | undefined): value is string {
  return Boolean(value && value.length < 2000 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value));
}

function messageFor(status: string | undefined, hasLink: boolean): { title: string; body: string } {
  if (status === "missing") {
    return {
      title: "That confirmation link is not active",
      body: "The link is missing, expired, or already used. Submit the form again. Nothing was added to the list.",
    };
  }
  if (status === "storage") {
    return {
      title: "You are not on the list yet",
      body: "Subscriber storage is not configured, so this address was not added. The confirmation request is still waiting. Open the link again after storage is set up.",
    };
  }
  if (status === "secret") {
    return {
      title: "You are not on the list yet",
      body: "Unsubscribe links are not configured, so this address was not added. Nothing was stored as a subscriber.",
    };
  }
  if (status === "mail") {
    return {
      title: "Digest confirmed",
      body: hasLink
        ? "You're on the weekly digest. The welcome email could not be sent, so the unsubscribe link is on this page."
        : "You're on the weekly digest. The welcome email could not be sent. Use the unsubscribe link from a later message, or write from the same address if you need it removed.",
    };
  }
  return {
    title: "Digest confirmed",
    body: "You'll get a weekly note when titles are newly marked Playable across the tracked PS3, PS4, and PS5 projects. The welcome message includes an unsubscribe link.",
  };
}

function Shell({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
      {children}
      <Link href="/" className="mt-6 inline-block text-sm underline decoration-primary/60 underline-offset-4">
        Back to games
      </Link>
    </main>
  );
}
