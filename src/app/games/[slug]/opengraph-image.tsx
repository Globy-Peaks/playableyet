import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { loadGame } from "@/lib/catalog";
import { ogStatusLines } from "@/lib/game-og";

export const alt = "Compatibility statuses from the PlayableYet snapshot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await loadGame(slug);
  if (!game) notFound();
  const lines = ogStatusLines(game);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#141824",
          color: "#f4f6fb",
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#c6f54a" }}>PLAYABLEYET</div>
        <div style={{ display: "flex", fontSize: 52, lineHeight: 1.15, marginTop: 28, maxWidth: 1040 }}>{game.name}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
          {lines.length === 0 ? (
            <div style={{ display: "flex", fontSize: 28, color: "#c5cad6" }}>No public compatibility report in this snapshot.</div>
          ) : (
            lines.map((line, index) => (
              <div
                key={line.project}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 30,
                  marginTop: index === 0 ? 0 : 16,
                  borderTop: "1px solid rgba(255,255,255,0.12)",
                  paddingTop: 14,
                }}
              >
                <div style={{ display: "flex" }}>{line.project}</div>
                <div style={{ display: "flex", color: "#c6f54a" }}>{line.label}</div>
              </div>
            ))
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
