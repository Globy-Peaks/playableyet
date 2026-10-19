import { NextResponse } from "next/server";
import { confirmNewsletter, confirmRedirectPath } from "@/lib/newsletter-actions";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const outcome = await confirmNewsletter(token);
    return NextResponse.redirect(new URL(confirmRedirectPath(outcome), request.url));
  } catch {
    return NextResponse.redirect(new URL("/newsletter/confirmed?status=storage", request.url));
  }
}
