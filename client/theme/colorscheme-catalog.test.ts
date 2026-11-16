import { describe, expect, it } from "vitest";
import type { ColorScheme } from "./appearance.type";
import {
  ColorSchemeCategory,
  colorSchemeFamilies,
  colorSchemeVariantFamilies,
  colorSchemeVariantLabel,
  findColorSchemeFamily,
  findColorSchemeFamilyByPair,
  findColorSchemeFamilyForMixedPair,
  groupColorSchemeFamilies,
  isColorSchemeFamilyAvailable,
  resolveColorSchemeFamilies
} from "./colorscheme-catalog";
import colorSchemes from "./colorschemes.json";

const scheme = (id: string, isDark = false) =>
  ({ id, isDark, label: id, colors: {} }) as unknown as ColorScheme;

describe("colour scheme catalog", () => {
  it("lists every defined colour scheme in at least one family", () => {
    const families = resolveColorSchemeFamilies(
      colorSchemes as unknown as ColorScheme[]
    );
    const ids = families.flatMap((family) =>
      [family.lightId, family.darkId].filter(Boolean)
    );
    for (const defined of colorSchemes) {
      expect(ids).toContain(defined.id);
    }
  });

  it("skips families whose schemes are not defined", () => {
    const families = resolveColorSchemeFamilies(
      [scheme("a-light"), scheme("b-dark", true)],
      [
        {
          id: "a",
          label: "A",
          category: ColorSchemeCategory.Nucleum,
          lightId: "a-light",
          darkId: "a-dark"
        },
        {
          id: "c",
          label: "C",
          category: ColorSchemeCategory.Studio,
          lightId: "c-light"
        },
        {
          id: "b",
          label: "B",
          category: ColorSchemeCategory.Developer,
          darkId: "b-dark"
        }
      ]
    );
    expect(families.map((family) => family.id)).toEqual(["a", "b"]);
    expect(families[0].light?.id).toBe("a-light");
    expect(families[0].dark).toBeUndefined();
  });

  it("groups by category in picker order and filters by name or category", () => {
    const families = resolveColorSchemeFamilies(
      [scheme("s-light"), scheme("n-light"), scheme("d-light")],
      [
        {
          id: "s",
          label: "Sand",
          category: ColorSchemeCategory.Studio,
          lightId: "s-light"
        },
        {
          id: "d",
          label: "Dusk",
          category: ColorSchemeCategory.Developer,
          lightId: "d-light"
        },
        {
          id: "n",
          label: "Night",
          category: ColorSchemeCategory.Nucleum,
          lightId: "n-light"
        }
      ]
    );
    expect(groupColorSchemeFamilies(families).map((g) => g.category)).toEqual([
      ColorSchemeCategory.Nucleum,
      ColorSchemeCategory.Studio,
      ColorSchemeCategory.Developer
    ]);
    expect(
      groupColorSchemeFamilies(families, "du").flatMap((g) =>
        g.families.map((f) => f.id)
      )
    ).toEqual(["d"]);
    expect(
      groupColorSchemeFamilies(families, "studio").flatMap((g) =>
        g.families.map((f) => f.id)
      )
    ).toEqual(["s"]);
  });

  it("matches the current pair exactly, so the app default is its own family", () => {
    const families = resolveColorSchemeFamilies(
      colorSchemes as unknown as ColorScheme[]
    );
    expect(
      findColorSchemeFamilyByPair(
        families,
        "colorscheme:clean_tidyblue_light",
        "colorscheme:clean_tidyoxide_dark"
      )?.id
    ).toBe("default");
    expect(
      findColorSchemeFamilyByPair(
        families,
        "colorscheme:clean_tidyblue_light",
        "colorscheme:clean_tidypink_dark"
      )
    ).toBeUndefined();
  });

  it("finds a family using a light or dark scheme id", () => {
    const families = resolveColorSchemeFamilies(
      colorSchemes as unknown as ColorScheme[]
    );
    expect(
      findColorSchemeFamily(families, "colorscheme:clean_tidymono_light")?.id
    ).toBe("mono");
    expect(
      findColorSchemeFamily(families, "colorscheme:clean_solarized_light")
        ?.category
    ).toBe(ColorSchemeCategory.Developer);
    expect(findColorSchemeFamily(families, "missing")).toBeUndefined();
    expect(
      colorSchemeFamilies.every((family) => family.lightId || family.darkId)
    ).toBe(true);
  });

  it("searches a light or dark picker by the scheme name it shows", () => {
    const families = resolveColorSchemeFamilies(
      colorSchemes as unknown as ColorScheme[]
    );
    const search = (variant: "light" | "dark", query: string) =>
      groupColorSchemeFamilies(
        colorSchemeVariantFamilies(families, variant),
        query,
        variant
      ).flatMap((group) =>
        group.families.map((family) => colorSchemeVariantLabel(family, variant))
      );

    const lightIds = colorSchemeVariantFamilies(families, "light").map(
      (family) => family.lightId
    );
    expect(new Set(lightIds).size).toBe(lightIds.length);
    expect(search("light", "blue")).toEqual(["Blue"]);
    expect(search("light", "default")).toEqual([]);
    expect(search("dark", "oxide")).toEqual(["Oxide"]);
    expect(search("dark", "sol")).toEqual(["Solarized"]);
    expect(
      groupColorSchemeFamilies(families, "default").flatMap((group) =>
        group.families.map((family) => family.id)
      )
    ).toEqual(["default"]);
  });
});

describe("colorSchemeVariantFamilies with partially defined families", () => {
  const families = resolveColorSchemeFamilies(
    [scheme("a-light"), scheme("b-dark", true), scheme("c-light")],
    [
      {
        id: "a",
        label: "A",
        category: ColorSchemeCategory.Nucleum,
        lightId: "a-light",
        darkId: "a-dark"
      },
      {
        id: "b",
        label: "B",
        category: ColorSchemeCategory.Developer,
        lightId: "b-light",
        darkId: "b-dark"
      },
      {
        id: "c",
        label: "C",
        category: ColorSchemeCategory.Studio,
        lightId: "c-light",
        darkId: "b-dark"
      }
    ]
  );
  const ids = (list: { id: string }[]) => list.map((family) => family.id);

  it("offers a light picker only families whose light scheme is defined", () => {
    const light = colorSchemeVariantFamilies(families, "light");
    expect(ids(light)).toEqual(["a", "c"]);
    expect(light.every((family) => family.light)).toBe(true);
    const search = (query: string) =>
      groupColorSchemeFamilies(light, query, "light").flatMap((group) =>
        ids(group.families)
      );
    expect(search("b")).toEqual([]);
    expect(search("developer")).toEqual([]);
    expect(search("a-light")).toEqual(["a"]);
  });

  it("offers a dark picker only families whose dark scheme is defined, once per scheme", () => {
    const dark = colorSchemeVariantFamilies(families, "dark");
    expect(ids(dark)).toEqual(["b"]);
    expect(dark.every((family) => family.dark)).toBe(true);
    const search = (query: string) =>
      groupColorSchemeFamilies(dark, query, "dark").flatMap((group) =>
        ids(group.families)
      );
    expect(search("a-dark")).toEqual([]);
    expect(search("nucleum")).toEqual([]);
    expect(search("b-dark")).toEqual(["b"]);
  });

  it("offers a combined picker only families with both schemes defined", () => {
    expect(ids(colorSchemeVariantFamilies(families, "both"))).toEqual(["c"]);
  });
});

describe("findColorSchemeFamilyForMixedPair", () => {
  const families = resolveColorSchemeFamilies(
    colorSchemes as unknown as ColorScheme[]
  );
  const familyFor = (lightId?: string, darkId?: string) =>
    findColorSchemeFamilyForMixedPair(families, lightId, darkId)?.id;

  it("uses the family of the light scheme first", () => {
    expect(
      familyFor(
        "colorscheme:clean_tidyred_light",
        "colorscheme:clean_tidyblue_dark"
      )
    ).toBe("red");
  });

  it("falls back to the family of the dark scheme for an unknown light id", () => {
    expect(
      familyFor("colorscheme:unknown_light", "colorscheme:clean_tidyred_dark")
    ).toBe("red");
  });

  it("falls back to Default when neither scheme is in a family", () => {
    expect(familyFor("colorscheme:unknown_light", undefined)).toBe("default");
  });

  it("finds nothing without families", () => {
    expect(
      findColorSchemeFamilyForMixedPair([], "colorscheme:x", "colorscheme:y")
    ).toBeUndefined();
  });
});

describe("colour scheme family availability with light-only and dark-only families", () => {
  const families = resolveColorSchemeFamilies(
    [
      scheme("lo-light"),
      scheme("do-dark", true),
      scheme("full-light"),
      scheme("full-dark", true)
    ],
    [
      {
        id: "light-only",
        label: "Lumen",
        category: ColorSchemeCategory.Nucleum,
        lightId: "lo-light",
        darkId: "lo-dark"
      },
      {
        id: "dark-only",
        label: "Dusk",
        category: ColorSchemeCategory.Developer,
        lightId: "do-light",
        darkId: "do-dark"
      },
      {
        id: "full",
        label: "Full",
        category: ColorSchemeCategory.Studio,
        lightId: "full-light",
        darkId: "full-dark"
      }
    ]
  );
  const ids = (list: { id: string }[]) => list.map((family) => family.id);
  const byId = (id: string) => families.find((family) => family.id === id)!;

  it("keeps partial families resolved but marks them available per variant", () => {
    expect(ids(families)).toEqual(["light-only", "dark-only", "full"]);
    expect(
      families.map((family) => [
        isColorSchemeFamilyAvailable(family, "light"),
        isColorSchemeFamilyAvailable(family, "dark"),
        isColorSchemeFamilyAvailable(family)
      ])
    ).toEqual([
      [true, false, false],
      [false, true, false],
      [true, true, true]
    ]);
  });

  it("leaves partial families out of the combined list and its search", () => {
    const both = colorSchemeVariantFamilies(families, "both");
    expect(ids(both)).toEqual(["full"]);
    const search = (query: string) =>
      groupColorSchemeFamilies(both, query, "both").flatMap((group) =>
        ids(group.families)
      );
    expect(search("lumen")).toEqual([]);
    expect(search("dusk")).toEqual([]);
    expect(search("developer")).toEqual([]);
    expect(search("nucleum")).toEqual([]);
    expect(search("full")).toEqual(["full"]);
  });

  it("still offers the defined side to the light and dark pickers", () => {
    expect(ids(colorSchemeVariantFamilies(families, "light"))).toEqual([
      "light-only",
      "full"
    ]);
    expect(ids(colorSchemeVariantFamilies(families, "dark"))).toEqual([
      "dark-only",
      "full"
    ]);
  });

  it("never matches a partial family as the current pair", () => {
    expect(
      findColorSchemeFamilyByPair(families, "lo-light", "lo-dark")
    ).toBeUndefined();
    expect(
      findColorSchemeFamilyByPair(families, "do-light", "do-dark")
    ).toBeUndefined();
    expect(
      findColorSchemeFamilyByPair(families, "full-light", "full-dark")?.id
    ).toBe("full");
  });

  it("finds a family for a picker only on its defined side", () => {
    expect(findColorSchemeFamily(families, "lo-light", "light")?.id).toBe(
      "light-only"
    );
    expect(findColorSchemeFamily(families, "lo-dark", "dark")).toBeUndefined();
    expect(findColorSchemeFamily(families, "do-dark", "dark")?.id).toBe(
      "dark-only"
    );
    expect(findColorSchemeFamily(families, "do-light", "light")).toBeUndefined();
    expect(findColorSchemeFamily(families, "full-dark", "light")).toBeUndefined();
    expect(findColorSchemeFamily(families, "lo-light")).toBeUndefined();
  });

  it("never falls back to a partial family when separate schemes are turned off", () => {
    const familyFor = (lightId?: string, darkId?: string) =>
      findColorSchemeFamilyForMixedPair(families, lightId, darkId)?.id;
    expect(familyFor("lo-light", "do-dark")).toBe("full");
    expect(familyFor("do-light", "lo-dark")).toBe("full");
    expect(familyFor("lo-light", "full-dark")).toBe("full");
    expect(familyFor(undefined, undefined)).toBe("full");
    expect(
      findColorSchemeFamilyForMixedPair(
        resolveColorSchemeFamilies(
          [scheme("d-light"), scheme("x-dark", true)],
          [
            {
              id: "default",
              label: "Default",
              category: ColorSchemeCategory.Nucleum,
              lightId: "d-light",
              darkId: "d-dark"
            },
            {
              id: "x",
              label: "X",
              category: ColorSchemeCategory.Studio,
              lightId: "d-light",
              darkId: "x-dark"
            }
          ]
        ),
        "d-light",
        "d-dark"
      )?.id
    ).toBe("x");
    expect(
      findColorSchemeFamilyForMixedPair(
        [byId("light-only"), byId("dark-only")],
        "lo-light",
        "do-dark"
      )
    ).toBeUndefined();
  });
});
