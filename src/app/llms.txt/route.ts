import { loadCatalog } from "@/lib/catalog";
import { llmsText } from "@/lib/llms-text";
import { siteUrl } from "@/lib/site";

export async function GET() {
  const catalog = await loadCatalog();
  return new Response(llmsText(siteUrl(), catalog), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
