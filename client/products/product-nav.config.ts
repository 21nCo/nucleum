/**
 * Single source of truth for product app menu and nav config.
 * Used by both the app (product.config.ts) and E2E tests so menu changes
 * are made in one place only.
 */
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { ResourceActionType } from "@21n/components/flux/resourceStores/resource.type";
import { resourceAction } from "@21n/components/flux/resourceStores/resource.utils";
import { Product } from "@21n/products/product.type";
import { Action } from "@21n/types/action.enum";
import { PointronAction } from "@21n/types/pointron/pointronAction.enum";

/** Nav labels shown in the app menu (for E2E getByRole('button', { name: ... })). */
export type AppMenuNavLabels = readonly string[];

/** Path by nav label for E2E assertions. */
export type PathByNavLabel = Record<string, string>;

export interface IProductNavConfig {
  /** App menu action IDs for landscape (used by app). */
  appMenu: readonly string[];
  /** App menu for landscape in dev (Nucleum only; optional "home"). */
  appMenuDev?: readonly string[];
  /** App menu action IDs for portrait (used by app). */
  appMenuPt: readonly string[];
  homePath: string;
  homePathPt: string;
  librarySectionLabel: string;
  /** E2E: nav button labels in order. */
  appMenuNavLabels: AppMenuNavLabels;
  /** E2E: which nav item is the timeline page. */
  timelinePageLabel: string;
  /** E2E: path for each nav label. */
  pathByNavLabel: PathByNavLabel;
  /** E2E: whether "Home" can appear in nav (Nucleum dev). */
  includeHomeInNav?: boolean;
}

const productNavConfig = {
  [Product.NUCLEUS]: {
    appMenu: [Action.CALENDAR, Action.OVERVIEW, Action.LIBRARY] as const,
    appMenuDev: [
      Action.HOME,
      Action.CALENDAR,
      Action.OVERVIEW,
      resourceAction(Resource.combination, ResourceActionType.BROWSE),
      Action.LIBRARY
    ] as const,
    appMenuPt: [
      Action.CALENDAR,
      Action.LIBRARY_PORTRAIT,
      Action.OVERVIEW
    ] as const,
    homePath: Action.CALENDAR,
    homePathPt: Action.LIBRARY_PORTRAIT,
    librarySectionLabel: "Nucleum",
    appMenuNavLabels: ["Calendar", "Overview", "Library"] as const,
    includeHomeInNav: false,
    timelinePageLabel: "Calendar",
    pathByNavLabel: {
      Calendar: "/calendar",
      Overview: "/overview",
      Library: "/library",
      Home: "/"
    } as Record<string, string>
  },
  [Product.MEMOTRON]: {
    appMenu: [
      resourceAction(Resource.node, ResourceActionType.CREATE),
      Action.CALENDAR,
      Action.OVERVIEW,
      Action.LIBRARY
    ] as const,
    appMenuPt: [] as const,
    homePath: Action.CALENDAR,
    homePathPt: Action.MOBILEHOME,
    librarySectionLabel: "Memory",
    appMenuNavLabels: ["Capture", "Calendar", "Overview", "Library"] as const,
    timelinePageLabel: "Calendar",
    pathByNavLabel: {
      Capture: "/capture",
      Calendar: "/calendar",
      Overview: "/overview",
      Library: "/library",
      Home: "/"
    } as Record<string, string>
  },
  [Product.POINTRON]: {
    appMenu: [
      PointronAction.FOCUS,
      Action.CALENDAR,
      Action.OVERVIEW,
      Action.LIBRARY
    ] as const,
    appMenuPt: [
      Action.OVERVIEW,
      Action.CALENDAR,
      PointronAction.FOCUS,
      Action.LIBRARY_PORTRAIT
    ] as const,
    homePath: Action.CALENDAR,
    homePathPt: PointronAction.FOCUS,
    librarySectionLabel: "Focus",
    appMenuNavLabels: ["Focus", "Calendar", "Overview", "Library"] as const,
    timelinePageLabel: "Calendar",
    pathByNavLabel: {
      Focus: "/focus",
      Calendar: "/calendar",
      Overview: "/overview",
      Library: "/library",
      Home: "/"
    } as Record<string, string>
  }
} satisfies Partial<Record<Product, IProductNavConfig>>;

const resolveNavConfig = (product: Product): IProductNavConfig => {
  const nav = productNavConfig[product];
  if (!nav) throw new Error(`Missing nav config for product: ${product}`);
  return nav;
};

/** Get nav config for the app (product.config.ts). */
export function getProductNavConfig(product: Product): IProductNavConfig {
  return resolveNavConfig(product);
}

/** E2E shape: homePath, appMenuNavLabels, pathByNavLabel, timelinePageLabel, librarySectionLabel, etc. */
export interface IE2EProductConfig {
  homePath: string;
  appMenuNavLabels: readonly string[];
  timelinePageLabel: string;
  pathByNavLabel: PathByNavLabel;
  librarySectionLabel: string;
  includeHomeInNav?: boolean;
}

/** Get config in the shape E2E tests expect. */
export function getE2EProductConfig(product: Product): IE2EProductConfig {
  const nav = resolveNavConfig(product);
  const config: IE2EProductConfig = {
    homePath: nav.homePath,
    appMenuNavLabels: nav.appMenuNavLabels,
    timelinePageLabel: nav.timelinePageLabel,
    pathByNavLabel: nav.pathByNavLabel,
    librarySectionLabel: nav.librarySectionLabel
  };
  if ("includeHomeInNav" in nav) config.includeHomeInNav = nav.includeHomeInNav;
  return config;
}

/** Resolve Product from E2E project name. */
export function productFromProjectName(projectName: string): Product {
  if (projectName === "pointron") return Product.POINTRON;
  if (projectName === "memotron") return Product.MEMOTRON;
  return Product.NUCLEUS;
}

export type NucleusAppMenuLabel =
  (typeof productNavConfig)[typeof Product.NUCLEUS]["appMenuNavLabels"][number];
