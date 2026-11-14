import type { ColorScheme } from "@21n/theme/appearance.type";

/** Groups shown in the colour scheme picker, in display order. */
export enum ColorSchemeCategory {
  Nucleum = "Nucleum",
  Studio = "Studio",
  Developer = "Developer"
}

/** A named colour scheme with up to one light and one dark variant. */
export type ColorSchemeFamily = {
  id: string;
  label: string;
  category: ColorSchemeCategory;
  lightId?: string;
  darkId?: string;
};

/** A family resolved against the schemes that exist, with its variants. */
export type ResolvedColorSchemeFamily = ColorSchemeFamily & {
  light?: ColorScheme;
  dark?: ColorScheme;
};

/** Families grouped under one picker heading. */
export type ColorSchemeFamilyGroup = {
  category: ColorSchemeCategory;
  families: ResolvedColorSchemeFamily[];
};

/**
 * Every colour scheme family the picker can show. A family whose schemes are
 * not defined yet is skipped, so entries can be listed ahead of their schemes.
 */
export const colorSchemeFamilies: ColorSchemeFamily[] = [
  {
    id: "default",
    label: "Default",
    category: ColorSchemeCategory.Nucleum,
    lightId: "colorscheme:clean_tidyblue_light",
    darkId: "colorscheme:clean_tidyoxide_dark"
  },
  {
    id: "blue",
    label: "Blue",
    category: ColorSchemeCategory.Nucleum,
    lightId: "colorscheme:clean_tidyblue_light",
    darkId: "colorscheme:clean_tidyblue_dark"
  },
  {
    id: "red",
    label: "Red",
    category: ColorSchemeCategory.Nucleum,
    lightId: "colorscheme:clean_tidyred_light",
    darkId: "colorscheme:clean_tidyred_dark"
  },
  {
    id: "mono",
    label: "Mono",
    category: ColorSchemeCategory.Nucleum,
    lightId: "colorscheme:clean_tidymono_light",
    darkId: "colorscheme:clean_tidyoxide_dark"
  },
  {
    id: "iris",
    label: "Iris",
    category: ColorSchemeCategory.Nucleum,
    lightId: "colorscheme:clean_tidyiris_light",
    darkId: "colorscheme:clean_tidyiris_dark"
  },
  {
    id: "violet",
    label: "Violet",
    category: ColorSchemeCategory.Nucleum,
    lightId: "colorscheme:clean_tidyviolet_light",
    darkId: "colorscheme:clean_tidyviolet_dark"
  },
  {
    id: "pink",
    label: "Pink",
    category: ColorSchemeCategory.Nucleum,
    lightId: "colorscheme:clean_tidypink_light",
    darkId: "colorscheme:clean_tidypink_dark"
  },
  {
    id: "orange",
    label: "Orange",
    category: ColorSchemeCategory.Nucleum,
    lightId: "colorscheme:clean_tidyorange_light",
    darkId: "colorscheme:clean_tidyorange_dark"
  },
  {
    id: "graphite",
    label: "Graphite",
    category: ColorSchemeCategory.Studio,
    lightId: "colorscheme:clean_graphite_light",
    darkId: "colorscheme:clean_graphite_dark"
  },
  {
    id: "solarized",
    label: "Solarized",
    category: ColorSchemeCategory.Developer,
    lightId: "colorscheme:clean_solarized_light",
    darkId: "colorscheme:clean_solarized_dark"
  }
];

const categoryOrder = Object.values(ColorSchemeCategory);

/** Resolves families against the defined schemes, dropping families with no variant. */
export function resolveColorSchemeFamilies(
  schemes: ColorScheme[],
  families: ColorSchemeFamily[] = colorSchemeFamilies
): ResolvedColorSchemeFamily[] {
  const byId = new Map(schemes.map((scheme) => [String(scheme.id), scheme]));
  return families
    .map((family) => ({
      ...family,
      light: family.lightId ? byId.get(family.lightId) : undefined,
      dark: family.darkId ? byId.get(family.darkId) : undefined
    }))
    .filter((family) => family.light || family.dark);
}

/** Groups resolved families by category in picker order, optionally filtered by a search query. */
export function groupColorSchemeFamilies(
  families: ResolvedColorSchemeFamily[],
  query = ""
): ColorSchemeFamilyGroup[] {
  const normalized = query.trim().toLowerCase();
  const matching = normalized
    ? families.filter(
        (family) =>
          family.label.toLowerCase().includes(normalized) ||
          family.category.toLowerCase().includes(normalized)
      )
    : families;
  return categoryOrder
    .map((category) => ({
      category,
      families: matching.filter((family) => family.category === category)
    }))
    .filter((group) => group.families.length > 0);
}

/** The family whose light and dark schemes are exactly the given pair. */
export function findColorSchemeFamilyByPair(
  families: ResolvedColorSchemeFamily[],
  lightId: string | undefined,
  darkId: string | undefined
): ResolvedColorSchemeFamily | undefined {
  return families.find(
    (family) => family.lightId === lightId && family.darkId === darkId
  );
}

/** The first family that uses a scheme id as its light or dark variant. */
export function findColorSchemeFamily(
  families: ResolvedColorSchemeFamily[],
  schemeId: string | undefined
): ResolvedColorSchemeFamily | undefined {
  if (!schemeId) return undefined;
  return families.find(
    (family) => family.lightId === schemeId || family.darkId === schemeId
  );
}
