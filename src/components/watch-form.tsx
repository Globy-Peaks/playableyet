"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WatchForm({
  slug,
  gameName,
  alreadyPlayable,
}: {
  slug: string;
  gameName: string;
  alreadyPlayable: boolean;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [devConfirmPath, setDevConfirmPath] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setState("sending");
    setDevConfirmPath(null);
    const response = await fetch("/api/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, slug }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      devConfirmPath?: string;
    };
    if (!response.ok) {
      setState("error");
      setMessage(data.error || "Could not save that request.");
      return;
    }
    setState("done");
    setMessage(data.message || "Check your inbox to confirm.");
    setDevConfirmPath(data.devConfirmPath ?? null);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-base font-medium">Email me when this becomes playable</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {alreadyPlayable
            ? "A playable report already exists. You can still watch for another project to reach playable."
            : `We'll email you after ${gameName} moves to Playable on a tracked project.`}{" "}
          Confirmation is required, and every message has an unsubscribe link.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="watch-email">
          Email
        </label>
        <Input
          id="watch-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 bg-background"
        />
        <Button type="submit" disabled={state === "sending"} className="h-10 px-4">
          {state === "sending" ? "Saving…" : "Watch this game"}
        </Button>
      </div>
      {message ? (
        <p className={state === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p>
      ) : null}
      {devConfirmPath ? (
        <p className="text-sm">
          Email delivery is off in this environment.{" "}
          <a className="underline decoration-primary/70 underline-offset-4" href={devConfirmPath}>
            Confirm this watch
          </a>
        </p>
      ) : null}
    </form>
  );
}
