"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterForm() {
  const baseId = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [devConfirmPath, setDevConfirmPath] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setState("sending");
    setDevConfirmPath(null);
    const response = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, consent, company_website: companyWebsite }),
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
    <form onSubmit={onSubmit} className="relative space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-base font-medium">Weekly newly playable digest</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          A weekly email of titles newly marked Playable across PS3, PS4, and PS5 emulators. Confirmation is required,
          and every message after that has an unsubscribe link.
        </p>
      </div>
      <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor={`${baseId}-company`}>Company website</label>
        <input
          id={`${baseId}-company`}
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          value={companyWebsite}
          onChange={(event) => setCompanyWebsite(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`${baseId}-email`}>
          Email
        </label>
        <Input
          id={`${baseId}-email`}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 bg-background"
        />
        <Button type="submit" disabled={state === "sending"} className="h-10 px-4">
          {state === "sending" ? "Sending…" : "Send confirmation"}
        </Button>
      </div>
      <label className="flex items-start gap-2 text-sm leading-6 text-muted-foreground" htmlFor={`${baseId}-consent`}>
        <input
          id={`${baseId}-consent`}
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1"
        />
        <span>
          Email me a weekly digest of titles newly marked Playable on the tracked PS3, PS4, and PS5 projects. I can
          unsubscribe at any time. PlayableYet stores this address with Resend only after I confirm.
        </span>
      </label>
      {message ? (
        <p className={state === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p>
      ) : null}
      {devConfirmPath ? (
        <p className="text-sm">
          Email delivery is off in this environment.{" "}
          <a className="underline decoration-primary/70 underline-offset-4" href={devConfirmPath}>
            Confirm this subscription
          </a>
        </p>
      ) : null}
    </form>
  );
}
