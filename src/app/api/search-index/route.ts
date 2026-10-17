import { loadCatalog } from "@/lib/catalog";
import { toSearchIndex } from "@/lib/sync/assemble";

export async function GET() {
  const catalog = await loadCatalog();
  return Response.json(toSearchIndex(catalog), {
    headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}
