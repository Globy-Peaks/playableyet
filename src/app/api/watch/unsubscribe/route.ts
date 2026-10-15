import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/watchlist";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const removed = token ? await unsubscribe(token) : null;
  const path = removed ? "/watch/unsubscribed" : "/watch/unsubscribed?status=missing";
  return NextResponse.redirect(new URL(path, request.url));
}
