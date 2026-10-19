import { NextResponse } from "next/server";
import { unsubscribeNewsletter, unsubscribeRedirectPath } from "@/lib/newsletter-actions";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const outcome = await unsubscribeNewsletter(token);
    return NextResponse.redirect(new URL(unsubscribeRedirectPath(outcome), request.url));
  } catch {
    return NextResponse.redirect(new URL("/newsletter/unsubscribed?status=storage", request.url));
  }
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const outcome = await unsubscribeNewsletter(token);
    if (outcome === "done") return new Response(null, { status: 200 });
    if (outcome === "storage") return new Response(null, { status: 503 });
    return new Response(null, { status: 400 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
