import { Suspense } from "react";
import Link from "next/link";

export default function ConfirmedPage({ searchParams }: PageProps<"/watch/confirmed">) {
  return (
    <Suspense fallback={<Shell title="Confirming…" body="Checking that confirmation link." />}>
      <Confirmed searchParams={searchParams} />
    </Suspense>
  );
}

async function Confirmed({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const missing = status === "missing";
  return (
    <Shell
      title={missing ? "That confirmation link is not active" : "Watch confirmed"}
      body={
        missing
          ? "The link is missing, expired, or already used. Open the game page and submit the form again."
          : "You’ll get one email when a tracked project for this game moves to Playable. Every message includes an unsubscribe link."
      }
    />
  );
}

function Shell({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
      <Link href="/" className="mt-6 inline-block text-sm underline decoration-primary/60 underline-offset-4">
        Back to games
      </Link>
    </main>
  );
}
