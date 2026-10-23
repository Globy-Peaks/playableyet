import { EMULATORS, PLATFORM_LABEL } from "@/lib/emulators";
import { alternateNamesForTitle } from "@/lib/search-filters";
import { statusPhrase } from "@/lib/status-copy";
import type { Game } from "@/lib/types";

export function videoGameJsonLd(game: Game, pageUrl: string, description: string) {
  const platforms = [...new Set(game.titles.map((title) => PLATFORM_LABEL[title.platform]))];
  const alternateName = alternateNamesForTitle(game.name);
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    ...(alternateName.length === 1
      ? { alternateName: alternateName[0] }
      : alternateName.length > 1
        ? { alternateName }
        : {}),
    url: pageUrl,
    description,
    identifier: game.titles.map((title) => ({
      "@type": "PropertyValue",
      propertyID: "titleId",
      value: title.id,
    })),
    gamePlatform: platforms,
    additionalProperty: game.reports.map((report) => ({
      "@type": "PropertyValue",
      name: `${EMULATORS[report.emulator].name} status (${report.titleId})`,
      propertyID: report.emulator,
      value: report.status,
      description: statusPhrase(report.emulator, report.status),
    })),
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
