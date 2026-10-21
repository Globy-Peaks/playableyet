export type TitleMedium = "disc" | "digital" | "unknown";

export type TitleRegion = "US" | "EU" | "Japan" | "Asia" | "Korea" | "unknown";

export type TitleEdition = {
  id: string;
  /** PlayStation-Titles region code, when the snapshot stored one. */
  region?: string;
};

const DISC_REGION: Record<string, TitleRegion> = {
  U: "US",
  E: "EU",
  J: "Japan",
  A: "Asia",
  K: "Korea",
};

/** Third letter of an NP* product code. H is SCE Asia; A is not a region here. */
const DIGITAL_REGION: Record<string, TitleRegion> = {
  U: "US",
  E: "EU",
  J: "Japan",
  H: "Asia",
  K: "Korea",
};

/**
 * Sony product-code letters. The first two mark the medium (BL/BC disc, NP digital).
 * The third marks the region. CUSA and PPSA do not encode either fact.
 */
function fromPrefix(titleId: string): { medium: TitleMedium; region: TitleRegion } {
  const id = titleId.trim().toUpperCase();
  if (!/^[A-Z]{4}\d{5}$/.test(id)) return { medium: "unknown", region: "unknown" };
  const prefix = id.slice(0, 4);

  const disc = prefix.match(/^(?:BL|BC)([UEJAK])[A-Z]$/);
  if (disc) return { medium: "disc", region: DISC_REGION[disc[1]] ?? "unknown" };

  if (prefix === "SLUS") return { medium: "disc", region: "US" };
  if (prefix === "SLES") return { medium: "disc", region: "EU" };
  if (prefix === "SLPM" || prefix === "SLPS") return { medium: "disc", region: "Japan" };

  const digital = prefix.match(/^NP([UEJHK])[A-Z]$/);
  if (digital) return { medium: "digital", region: DIGITAL_REGION[digital[1]] ?? "unknown" };

  // PS4 physical product codes. The software title ID is often still CUSA.
  if (prefix === "PCJS" || prefix === "PLJM" || prefix === "PLJS") {
    return { medium: "disc", region: "Japan" };
  }

  // PS5 product codes whose prefix states a region and not disc vs digital.
  if (prefix === "ELJM") return { medium: "unknown", region: "Japan" };
  if (prefix === "ECAS" || prefix === "ELAS") return { medium: "unknown", region: "Asia" };

  return { medium: "unknown", region: "unknown" };
}

/** First letter of a PlayStation-Titles region code (UP, EP, JP, HP, KP, and third-party UB/EB/…). */
function regionFromCatalog(code: string | undefined): TitleRegion | null {
  const letter = code?.trim().toUpperCase()[0];
  if (letter === "U") return "US";
  if (letter === "E") return "EU";
  if (letter === "J") return "Japan";
  if (letter === "H") return "Asia";
  if (letter === "K") return "Korea";
  return null;
}

export function classifyTitleId(titleId: string, catalogRegion?: string): { medium: TitleMedium; region: TitleRegion } {
  const fromId = fromPrefix(titleId);
  if (fromId.region !== "unknown") return fromId;
  return { medium: fromId.medium, region: regionFromCatalog(catalogRegion) ?? "unknown" };
}

/** Disc or digital (PSN), plus region. Unknown when the prefix and catalog do not say. */
export function titleEditionLabel(titleId: string, catalogRegion?: string): string {
  const { medium, region } = classifyTitleId(titleId, catalogRegion);
  const mediumLabel = medium === "digital" ? "digital (PSN)" : medium === "disc" ? "disc" : null;
  if (region !== "unknown" && mediumLabel) return `${region} ${mediumLabel}`;
  if (region !== "unknown") return `${region}, format unknown`;
  if (mediumLabel) return `${mediumLabel}, region unknown`;
  return "unknown";
}

export function formatEditionList(editions: TitleEdition[]): string {
  return editions.map((edition) => `${edition.id} (${titleEditionLabel(edition.id, edition.region)})`).join(", ");
}
