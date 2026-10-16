import { EMULATORS, PLATFORM_LABEL } from "@/lib/emulators";
import { STATUS_DETAIL, STATUS_LABEL } from "@/lib/status";
import type { Game } from "@/lib/types";

export function videoGameJsonLd(game: Game, pageUrl: string, description: string) {
  const platforms = [...new Set(game.titles.map((title) => PLATFORM_LABEL[title.platform]))];
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
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
      description: `${STATUS_LABEL[report.status]}: ${STATUS_DETAIL[report.status]}`,
    })),
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
