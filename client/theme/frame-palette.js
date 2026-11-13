/**
 * Frame palette tokens.
 *
 * A colour scheme flagged `hasFramePalette` defines a frame copy (`f*`) and a
 * content copy (`c*`) of each role below, plus `fonaps3`, the colour drawn on
 * the selected frame accent. ThemeLayer remaps the role variables to the frame
 * copies inside `.app-chrome` and back to the content copies inside
 * `.app-content`. The tokens are only read through those CSS variables:
 * the Tailwind theme emits them as the same `--colors-*` RGB triplets the
 * themer writes, without making them Tailwind colours.
 */
export const FRAME_PALETTE_ROLES = [
  "bgs1",
  "bgs2",
  "bgs3",
  "bgs4",
  "bgs5",
  "fgs1",
  "fgs2",
  "fgs3",
  "fgs4",
  "brs1",
  "brs2",
  "brs3",
  "brs4",
  "aps1",
  "aps2",
  "aps3"
];

export const FRAME_PALETTE_TOKENS = [
  ...FRAME_PALETTE_ROLES.map((role) => `f${role}`),
  ...FRAME_PALETTE_ROLES.map((role) => `c${role}`),
  "fonaps3"
];

/**
 * Splits a colour scheme's colours into the shared roles, which become
 * Tailwind colours, and its frame palette tokens, which are emitted only as
 * CSS variables so they do not add utilities (for example the safelisted
 * gradient stops at every opacity step) to every product's stylesheet.
 *
 * @param {Readonly<Record<string, string | undefined>>} colors
 * @returns {{ colors: Record<string, string>, framePalette: Record<string, string> }}
 */
export function splitFramePalette(colors) {
  /** @type {Record<string, string>} */
  const shared = {};
  /** @type {Record<string, string>} */
  const framePalette = {};
  for (const [name, value] of Object.entries(colors)) {
    if (value === undefined) {
      continue;
    }
    if (FRAME_PALETTE_TOKENS.includes(name)) {
      framePalette[name] = value;
    } else {
      shared[name] = value;
    }
  }
  return { colors: shared, framePalette };
}

/**
 * Value of ThemeLayer's `data-frame-palette` attribute: present only for a
 * scheme flagged `hasFramePalette`, so the frame remap applies to it alone.
 *
 * @param {{ hasFramePalette?: boolean } | null | undefined} colorScheme
 * @returns {"" | undefined}
 */
export function resolveFramePaletteAttribute(colorScheme) {
  return colorScheme?.hasFramePalette ? "" : undefined;
}
