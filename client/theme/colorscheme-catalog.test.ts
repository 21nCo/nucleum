import { describe, expect, it } from "vitest";
import type { ColorScheme } from "./appearance.type";
import {
  ColorSchemeCategory,
  colorSchemeFamilies,
  findColorSchemeFamily,
  findColorSchemeFamilyByPair,
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
});
