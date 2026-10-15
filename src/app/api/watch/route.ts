import { loadGame } from "@/lib/catalog";
import { sendConfirmEmail } from "@/lib/notify";
import { isEmail, normalizeEmail, subscribe } from "@/lib/watchlist";

export async function POST(request: Request) {
  let body: { email?: unknown; slug?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; slug?: unknown };
  } catch {
    return Response.json({ error: "Send an email and a game slug." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!isEmail(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) {
    return Response.json({ error: "That game is not in the index." }, { status: 400 });
  }

  const game = await loadGame(slug);
  if (!game) {
    return Response.json({ error: "That game is not in the index." }, { status: 404 });
  }

  try {
    const subscription = await subscribe({ email, slug: game.slug, gameName: game.name });
    if (subscription.status === "confirmed") {
      return Response.json({
        message: "This address is already confirmed for this game.",
      });
    }

    let sent = false;
    try {
      sent = await sendConfirmEmail(subscription);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Email failed";
      return Response.json(
        { error: `The watch was saved, but the confirmation email could not be sent. ${detail}` },
        { status: 502 },
      );
    }

    const dev =
      process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY?.trim()
        ? `/api/watch/confirm?token=${subscription.confirmToken}`
        : undefined;

    return Response.json({
      message: sent
        ? "Check your inbox and open the confirmation link. Nothing is sent until you do."
        : "Saved. Email delivery is not configured in this environment, so no message was sent.",
      devConfirmPath: dev,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not store that watch.";
    return Response.json({ error: message }, { status: 500 });
  }
}
