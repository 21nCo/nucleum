import { describe, expect, it } from "vitest";

import colorSchemes from "@21n/theme/colorschemes.json";
import {
  FRAME_PALETTE_TOKENS,
  GRADIENT_SAFELIST_PATTERN
} from "@21n/theme/frame-palette.js";

import themeLayerSource from "../shell/layers/themeLayer/ThemeLayer.svelte?raw";

const framedSchemes = colorSchemes.filter(
  (scheme) => (scheme as { hasFramePalette?: boolean }).hasFramePalette
);

describe("frame palette", () => {
  it("is used by the Graphite schemes", () => {
    expect(framedSchemes.map((scheme) => scheme.tailwindSelector)).toEqual([
      "cs_graphite_light",
      "cs_graphite_dark"
    ]);
  });

  it("lists every frame and content token the ThemeLayer remap reads", () => {
    const read = new Set(
      [
        ...themeLayerSource.matchAll(/--colors-\w+:\s*var\(--colors-(\w+)\)/g)
      ].map((match) => match[1])
    );
    expect([...read].sort()).toEqual([...FRAME_PALETTE_TOKENS].sort());
  });

  it.each(framedSchemes.map((scheme) => [scheme.tailwindSelector, scheme]))(
    "%s defines every frame palette token",
    (_, scheme) => {
      const colors = scheme.colors as Record<string, string>;
      const missing = FRAME_PALETTE_TOKENS.filter((token) => !colors[token]);
      expect(missing).toEqual([]);
    }
  );

  it("is not defined by schemes without the flag", () => {
    const leaking = colorSchemes
      .filter((scheme) => !framedSchemes.includes(scheme))
      .flatMap((scheme) =>
        FRAME_PALETTE_TOKENS.filter((token) => token in scheme.colors).map(
          (token) => `${scheme.tailwindSelector}:${token}`
        )
      );
    expect(leaking).toEqual([]);
  });
});

describe("GRADIENT_SAFELIST_PATTERN", () => {
  it("keeps safelisting gradient stops of the shared colour roles", () => {
    for (const className of [
      "from-aps1",
      "via-bgs2",
      "to-fgs1",
      "from-fgs4/50",
      "to-transparent",
      "via-brs3/5"
    ]) {
      expect(GRADIENT_SAFELIST_PATTERN.test(className), className).toBe(true);
    }
  });

  it("skips gradient stops of frame palette tokens at every opacity", () => {
    for (const token of FRAME_PALETTE_TOKENS) {
      for (const className of [
        `from-${token}`,
        `via-${token}`,
        `to-${token}`,
        `from-${token}/50`,
        `to-${token}/5`
      ]) {
        expect(GRADIENT_SAFELIST_PATTERN.test(className), className).toBe(
          false
        );
      }
    }
  });
});
