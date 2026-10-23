export type SearchAlias = {
  /** Lowercase query token. */
  token: string;
  /** Words after the same folding search uses, including roman numerals. */
  expansion: string;
  /** Spelling used as schema.org alternateName. */
  label: string;
};

/** Popular series abbreviations. Matching is exact on the token, then the expansion. */
export const SEARCH_ALIASES: SearchAlias[] = [
  { token: "gta", expansion: "grand theft auto", label: "GTA" },
  { token: "rdr", expansion: "red dead redemption", label: "RDR" },
  { token: "tlou", expansion: "the last of us", label: "TLOU" },
  { token: "gow", expansion: "god of war", label: "GoW" },
  { token: "gt7", expansion: "gran turismo 7", label: "GT7" },
  { token: "des", expansion: "demons souls", label: "DeS" },
  { token: "mgs", expansion: "metal gear solid", label: "MGS" },
  { token: "ff", expansion: "final fantasy", label: "FF" },
];

const BY_TOKEN = new Map(SEARCH_ALIASES.map((alias) => [alias.token, alias]));

export function expandAliasWords(words: string[]): string[] {
  const expanded: string[] = [];
  for (const word of words) {
    const alias = BY_TOKEN.get(word);
    if (alias) expanded.push(...alias.expansion.split(" "));
    else expanded.push(word);
  }
  return expanded;
}
