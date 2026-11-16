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

  it("keeps every resolved family when picking both variants", () => {
    expect(ids(colorSchemeVariantFamilies(families, "both"))).toEqual([
      "a",
      "b",
      "c"
    ]);
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
