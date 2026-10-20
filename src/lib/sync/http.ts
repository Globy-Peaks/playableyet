const USER_AGENT = "PlayableYet/0.1 (compatibility tracker; public status sync)";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchText(url: string, attempt = 0): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/plain, text/tab-separated-values, application/json, text/markdown, */*",
    },
  });
  if ((response.status === 429 || response.status === 503) && attempt < 4) {
    const retry = Number(response.headers.get("retry-after")) || 2;
    await sleep(retry * 1000);
    return fetchText(url, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.text();
}

export async function fetchJson<T>(url: string): Promise<T> {
  const text = await fetchText(url);
  return JSON.parse(text) as T;
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export type GithubPage<T> = { data: T; link: string | null };

async function githubRequest<T>(url: string, attempt = 0): Promise<GithubPage<T>> {
  const response = await fetch(url, { headers: githubHeaders() });
  if ((response.status === 403 || response.status === 429) && attempt < 5) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    const reset = Number(response.headers.get("x-ratelimit-reset"));
    if (remaining === "0" && reset) {
      const waitMs = Math.max(1000, reset * 1000 - Date.now() + 1500);
      if (waitMs > 15 * 60 * 1000) {
        throw new Error(`GitHub rate limit resets in ${Math.round(waitMs / 1000)}s for ${url}`);
      }
      await sleep(waitMs);
      return githubRequest<T>(url, attempt + 1);
    }
    const retry = Number(response.headers.get("retry-after")) || 2 + attempt;
    await sleep(retry * 1000);
    return githubRequest<T>(url, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`GitHub ${response.status} for ${url}`);
  }
  return { data: (await response.json()) as T, link: response.headers.get("link") };
}

export async function githubJson<T>(url: string): Promise<T> {
  const { data } = await githubRequest<T>(url);
  return data;
}

export async function githubJsonPage<T>(url: string): Promise<GithubPage<T>> {
  return githubRequest<T>(url);
}

/**
 * Next page from a GitHub Link header.
 * Large issue lists reject `page` past 1,000 results and require the `after` cursor.
 */
export function nextGithubPage(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/i);
    if (!match?.[1]) continue;
    try {
      const url = new URL(match[1]);
      if (url.searchParams.has("after") || url.searchParams.has("before")) url.searchParams.delete("page");
      return url.toString();
    } catch {
      return null;
    }
  }
  return null;
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}
