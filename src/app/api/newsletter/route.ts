import { submitNewsletter } from "@/lib/newsletter-actions";

export async function POST(request: Request) {
  try {
    const result = await submitNewsletter(request);
    const headers = result.status === 429 ? { "Retry-After": "3600" } : undefined;
    return Response.json(result.body, { status: result.status, headers });
  } catch {
    return Response.json({ error: "Could not store that request." }, { status: 500 });
  }
}
