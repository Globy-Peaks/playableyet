/**
 * Regional spellings of one product. The canonical name is the page title.
 * A demo is its own group. Different products stay off this list:
 * "Grand Theft Auto 3" and "Grand Theft Auto III – The Definitive Edition"
 * are not the same game.
 */
export type TitleGroupAlias = {
  /** Display name and slug source for the merged page. */
  name: string;
  /** Other regional titles that publish on that page. */
  variants: string[];
};

export const TITLE_GROUP_ALIASES: TitleGroupAlias[] = [
  {
    name: "Ratchet & Clank: Tools of Destruction",
    variants: ["Ratchet & Clank Future: Tools of Destruction"],
  },
  {
    name: "Ratchet & Clank: Tools of Destruction Demo",
    variants: ["Ratchet & Clank Future: Tools of Destruction Demo"],
  },
  {
    name: "Ratchet & Clank: A Crack In Time",
    variants: ["Ratchet & Clank Future: A Crack in Time"],
  },
  {
    name: "Ratchet & Clank: A Crack in Time Ratchet Demo",
    variants: ["Ratchet & Clank Future: A Crack in Time Ratchet Demo"],
  },
  {
    name: "Ratchet & Clank: Quest for Booty",
    variants: ["Ratchet & Clank Future: Quest for Booty"],
  },
  {
    // PS3 Japan numbered this release. The PS4 English title omits the number.
    name: "STAR OCEAN: Integrity and Faithlessness",
    variants: ["Star Ocean 5: Integrity And Faithlessness"],
  },
];
