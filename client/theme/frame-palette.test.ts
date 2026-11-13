import { describe, expect, it } from "vitest";

import colorSchemes from "@21n/theme/colorschemes.json";
import {
  FRAME_PALETTE_TOKENS,
  splitFramePalette
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

describe("splitFramePalette", () => {
  it("keeps frame palette tokens out of the Tailwind colours", () => {
    const [graphite] = framedSchemes;
    const { colors, framePalette } = splitFramePalette(
      graphite.colors as Record<string, string>
    );
    expect(Object.keys(framePalette).sort()).toEqual(
      [...FRAME_PALETTE_TOKENS].sort()
    );
    expect(FRAME_PALETTE_TOKENS.filter((token) => token in colors)).toEqual([]);
    expect(colors.bgs2).toBe(graphite.colors.bgs2);
    expect(colors.fgs1).toBe(graphite.colors.fgs1);
    expect(colors.aps1).toBe(graphite.colors.aps1);
  });

  it("leaves schemes without a frame palette unchanged", () => {
    const plain = colorSchemes.find(
      (scheme) => scheme.tailwindSelector === "cs_tidigit_light"
    )!;
    const { colors, framePalette } = splitFramePalette(
      plain.colors as Record<string, string>
    );
    expect(colors).toEqual(plain.colors);
    expect(framePalette).toEqual({});
  });
});
