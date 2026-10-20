import { EMULATORS } from "@/lib/emulators";
import type { Catalog, EmulatorId } from "@/lib/types";
import { siteUrl } from "@/lib/site";
import { readWatchlist, updateWatchlist, type Subscription } from "@/lib/watchlist";

export type NotifyResult = { sent: number; skipped: number };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  const from = process.env.RESEND_FROM?.trim() || "PlayableYet <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend ${response.status}: ${detail.slice(0, 240)}`);
  }
  return true;
}

export async function sendConfirmEmail(subscription: Subscription) {
  const url = `${siteUrl()}/api/watch/confirm?token=${subscription.confirmToken}`;
  const name = subscription.gameName;
  const html = `<p>Confirm that you want an email when <strong>${escapeHtml(name)}</strong> gets a playable report on PlayableYet.</p><p><a href="${url}">Confirm this watch</a></p><p>If you did not ask for this, ignore the message.</p>`;
  const text = `Confirm your PlayableYet watch for ${name}:\n${url}\n\nIf you did not ask for this, ignore the message.`;
  return sendEmail(subscription.email, `Confirm your watch for ${name}`, html, text);
}

export async function notifyPlayable(catalog: Catalog, day: string): Promise<NotifyResult> {
  const fresh = new Map<string, { name: string; slug: string; emulators: EmulatorId[] }>();
  for (const game of catalog.games) {
    const emulators = [
      ...new Set(
        game.history
          .filter((event) => !event.initial && event.status === "playable" && event.at === day)
          .map((event) => event.emulator),
      ),
    ];
    if (!emulators.length) continue;
    const hit = { name: game.name, slug: game.slug, emulators };
    fresh.set(game.slug, hit);
    for (const alias of game.aliases ?? []) fresh.set(alias, hit);
  }
  if (fresh.size === 0) return { sent: 0, skipped: 0 };

  const key = process.env.RESEND_API_KEY?.trim();
  let sent = 0;
  let skipped = 0;
  const delivered: { id: string; emulators: EmulatorId[] }[] = [];

  const store = await readWatchlist();
  for (const subscription of store.subscriptions) {
    if (subscription.status !== "confirmed") continue;
    const hit = fresh.get(subscription.slug);
    if (!hit) continue;
    const already = new Set(subscription.notified.map((item) => item.emulator));
    const pending = hit.emulators.filter((emulator) => !already.has(emulator));
    if (pending.length === 0) continue;
    if (!key) {
      skipped += 1;
      continue;
    }
    const names = pending.map((emulator) => EMULATORS[emulator].name).join(", ");
    const page = `${siteUrl()}/games/${hit.slug}`;
    const unsub = `${siteUrl()}/api/watch/unsubscribe?token=${subscription.unsubToken}`;
    const html = `<p><strong>${escapeHtml(hit.name)}</strong> is now marked playable on ${escapeHtml(names)}.</p><p><a href="${page}">Open the PlayableYet page</a></p><p><a href="${unsub}">Unsubscribe</a></p>`;
    const text = `${hit.name} is now marked playable on ${names}.\n${page}\n\nUnsubscribe: ${unsub}`;
    try {
      await sendEmail(subscription.email, `${hit.name} is playable on ${names}`, html, text);
      delivered.push({ id: subscription.id, emulators: pending });
      sent += 1;
    } catch (error) {
      console.error("notify failed", error instanceof Error ? error.message : error);
      skipped += 1;
    }
  }

  if (delivered.length) {
    const stamp = new Date().toISOString();
    await updateWatchlist((current) => {
      for (const item of delivered) {
        const subscription = current.subscriptions.find((entry) => entry.id === item.id);
        if (!subscription) continue;
        for (const emulator of item.emulators) {
          subscription.notified.push({ emulator, at: stamp });
        }
      }
    });
  }

  return { sent, skipped };
}
