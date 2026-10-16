import type { FeedItem } from "@/lib/feeds";

const SITE_NAME = "PlayableYet";

export function websiteJsonLd(url: string, description: string) {
  return {
    "@type": "WebSite",
    name: SITE_NAME,
    url,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function newlyPlayableItemListJsonLd(items: FeedItem[], origin: string) {
  return {
    "@type": "ItemList",
    name: "Newly playable this week",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${origin}/games/${item.slug}`,
    })),
  };
}

export function homeJsonLd(url: string, description: string, newlyPlayable: FeedItem[]) {
  const graph: { "@type": string }[] = [websiteJsonLd(url, description)];
  if (newlyPlayable.length > 0) graph.push(newlyPlayableItemListJsonLd(newlyPlayable, url));
  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
