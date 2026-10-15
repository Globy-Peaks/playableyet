import { Suspense } from "react";
import Link from "next/link";

export default function UnsubscribedPage({ searchParams }: PageProps<"/watch/unsubscribed">) {
  return (
    <Suspense fallback={<p className="px-4 py-16 text-sm text-muted-foreground">Checking that link…</p>}>
      <Result searchParams={searchParams} />
    </Suspense>
  );
}

async function Result({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const missing = status === "missing";
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        {missing ? "That unsubscribe link is not active" : "Unsubscribed"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {missing
          ? "Nothing was removed. The link does not match a current watch."
          : "That email will not be notified for this game. You can subscribe again from the game page."}
      </p>
      <Link href="/" className="mt-6 inline-block text-sm underline decoration-primary/60 underline-offset-4">
        Back to games
      </Link>
    </main>
  );
}
