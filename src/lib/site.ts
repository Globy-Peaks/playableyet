export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://127.0.0.1:43123";
}

const GITHUB_REPOS = [
  "shadps4-compatibility/shadps4-game-compatibility",
  "shadps4-emu/shadPS4",
  "red-prig/fpps4-game-compatibility",
  "red-prig/fpPS4",
  "sharpemu/sharpemu-site",
  "KytyPS5/KytyPS5",
  "boykopovar/AnyPS5",
  "andshrew/PlayStation-Titles",
  "AlxcBTW/anyps5-roadmap",
  "RPCS3/rpcs3",
];

const HOSTS = new Set([
  "rpcs3.net",
  "www.rpcs3.net",
  "github.com",
  "shadps4.net",
  "www.shadps4.net",
  "fpps4.net",
  "www.fpps4.net",
  "sharpemu.app",
  "www.sharpemu.app",
  "kytyps5.github.io",
  "boykopovar.github.io",
]);

export function allowedHttpUrl(input: string, fallback: string): string {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:") return fallback;
    if (!HOSTS.has(url.hostname)) return fallback;
    if (url.hostname === "github.com") {
      const repo = url.pathname.split("/").filter(Boolean).slice(0, 2).join("/");
      if (!GITHUB_REPOS.includes(repo)) return fallback;
    }
    if (url.hostname === "boykopovar.github.io" && !url.pathname.startsWith("/AnyPS5")) {
      return fallback;
    }
    return url.toString();
  } catch {
    return fallback;
  }
}
