import { NextResponse } from "next/server";
import { confirmSubscription } from "@/lib/watchlist";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const found = token ? await confirmSubscription(token) : null;
  const path = found ? "/watch/confirmed" : "/watch/confirmed?status=missing";
  return NextResponse.redirect(new URL(path, request.url));
}
