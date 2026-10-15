import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">That page is not in the index</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        The game slug does not match the current snapshot. Search from the home page, or check the title ID.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm underline decoration-primary/60 underline-offset-4">
        Back to games
      </Link>
    </main>
  );
}
