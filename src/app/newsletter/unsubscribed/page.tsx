import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Digest unsubscribe",
  robots: { index: false, follow: false },
};

export default function UnsubscribedPage({ searchParams }: PageProps<"/newsletter/unsubscribed">) {
  return (
    <Suspense fallback={<p className="px-4 py-16 text-sm text-muted-foreground">Checking that link…</p>}>
      <Result searchParams={searchParams} />
    </Suspense>
  );
}

function unsubscribedCopy(status: string | undefined): { title: string; body: string } {
  if (status === "missing") {
    return {
      title: "That unsubscribe link is not active",
      body: "The link is missing or expired. You are still subscribed if you had confirmed.",
    };
  }
  if (status === "storage") {
    return {
      title: "Unsubscribe was not saved",
      body: "The topic could not be updated, so this address may still receive the PlayableYet digest. Open the link again later.",
    };
  }
  return {
    title: "Unsubscribed",
    body: "This address will not receive the PlayableYet weekly digest. Other mail to the same address is unchanged.",
  };
}

async function Result({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const copy = unsubscribedCopy(status);
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.body}</p>
      <Link href="/" className="mt-6 inline-block text-sm underline decoration-primary/60 underline-offset-4">
        Back to games
      </Link>
    </main>
  );
}
