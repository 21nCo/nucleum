/**
 * Frame palette tokens.
 *
 * A colour scheme flagged `hasFramePalette` defines a frame copy (`f*`) and a
 * content copy (`c*`) of each role below, plus `fonaps3`, the colour drawn on
 * the selected frame accent. ThemeLayer remaps the role variables to the frame
 * copies inside `.app-chrome` and back to the content copies inside
 * `.app-content`. The tokens are only read through those CSS variables, so
 * they must not generate Tailwind utilities.
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
 * Safelists every gradient stop utility (`from-*`, `via-*`, `to-*`) except
 * those of frame palette tokens, which would otherwise add thousands of unused
 * rules (one per token, stop and opacity step) to every product's stylesheet.
 */
export const GRADIENT_SAFELIST_PATTERN = new RegExp(
  `(from|via|to)-(?!(?:${FRAME_PALETTE_TOKENS.join("|")})(?:/|$))(.+)`
);
