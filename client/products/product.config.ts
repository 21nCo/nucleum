import { Extension, OverviewPanel, Product } from "@21n/products/product.type";
import { getProductNavConfig } from "./product-nav.config";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { Action } from "@21n/types/action.enum";
import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
import { resourceConfig } from "@21n/components/flux/resourceStores/resource.config";
import type { IResourceTableConfig } from "@21n/components/flux/flux.type";
import type { ISelectItem } from "@21n/types/select.type";
import {
  nextProducts,
  nextResourceTableMap,
  nextNucleusOverviewPanelSwitcherItems
} from "@21n/next/product.config";
import { productRegistry } from "@21n/shared-config/product.config";
import type { IProductConfigBase as ISharedProductConfigBase } from "@21n/shared-config/product.config";

const isDev = import.meta.env?.DEV || false;

interface SettingsSection {
  children: (Action | MemotronAction | string)[];
  isHideTitle?: boolean;
  orientation?: "horizontal" | "vertical";
  section: string;
}

type IProductConfigBase = Omit<ISharedProductConfigBase, "resources"> & {
  resources: {
    browse: Resource[];
    table: Resource[];
  };
};

export interface IAppConfigBase extends IProductConfigBase {
  /**
   * @deprecated
   */
  version?: string;
  /**
   * @deprecated
   */
  build?: number;
  /**
   * App menu for landscape mode
   */
  appMenu: string[];
  /**
   * App menu for portrait mode
   */
  appMenuPt: string[];
  /**
   * Home path for landscape mode
   */
  homePath: string;
  /**
   * Home path for portrait mode
   */
  homePathPt: string;
  isShowCaptureOnMobile?: boolean;
  settings?: SettingsSection[];
  databaseName?: string;
  librarySectionLabel?: string;
  configurableShortcuts?: string[];
  oAuthProviders?: ("google" | "apple" | "github")[];
  overviewPanelSwitcherItems?: ISelectItem[];
}

interface IAppConfig extends IAppConfigBase {
  tableConfig: IResourceTableConfig[];
}

interface IExtensionConfig extends IProductConfigBase {
  tableConfig: IResourceTableConfig[];
}

const commonConfigurableShortcuts = [
  Action.EDIT_MODE,
  Action.CMD,
  Action.SEARCH,
  Action.GO_BACK,
  Action.GO_FORWARD
];

const commonTables = [Resource.accessLog, Resource.tz];

const linkabilityTables = [
  Resource.collection,
  Resource.property,
  Resource.view,
  Resource.link,
  Resource.linkTag
];

const filesAbilityTables = [Resource.file];

const resourceTableMap: Record<string, Resource[]> = {
  [Product.NUCLEUM]: [Resource.event],
  [Product.MEMOTRON]: [Resource.node, Resource.capture],
  [Product.POINTRON]: [
    Resource.goal,
    Resource.task,
    Resource.session,
    Resource.sessionLog
  ],
  ...nextResourceTableMap
};

const nucleusNav = getProductNavConfig(Product.NUCLEUM);
const memotronNav = getProductNavConfig(Product.MEMOTRON);
const pointronNav = getProductNavConfig(Product.POINTRON);

const resolveBaseSharedProductConfig = (productName: Product) =>
  productRegistry[productName.toString() as keyof typeof productRegistry];

export const products: Record<string, IAppConfigBase> = {
  [Product.NUCLEUM]: {
    ...resolveBaseSharedProductConfig(Product.NUCLEUM),
    appMenu: (isDev && nucleusNav.appMenuDev
      ? nucleusNav.appMenuDev
      : nucleusNav.appMenu) as string[],
    appMenuPt: [...nucleusNav.appMenuPt],
    homePath: nucleusNav.homePath,
    homePathPt: nucleusNav.homePathPt,
    resources: {
      browse: [Resource.collection, Resource.event],
      table: [
        ...commonTables,
        ...Array.from(Object.values(resourceTableMap)).flat(),
        ...linkabilityTables,
        ...filesAbilityTables,
        Resource.combination
      ]
    },
    librarySectionLabel: nucleusNav.librarySectionLabel,
    configurableShortcuts: [
      ...commonConfigurableShortcuts,
      "SAVE_CAPTURE_SHORTCUT",
      "ACTIVATE_LINK_BOX"
    ],
    overviewPanelSwitcherItems: [
      { label: "Dashboard", value: OverviewPanel.DASHBOARD, icon: "overview" },
      { label: "Graph", value: OverviewPanel.GRAPH, icon: "graph" },
      ...nextNucleusOverviewPanelSwitcherItems
    ],
    settings: [
      {
        children: [
          Action.SYNC_SETTINGS,
          Action.ARTIFICIAL_INTELLIGENCE,
          Action.DATA_SETTINGS,
          Action.USER_BILLING
        ],
        isHideTitle: true,
        orientation: "horizontal",
        section: "app"
      },
      {
        children: [
          Action.MODE_OF_INTERACTION,
          Action.APPEARANCE_SETTINGS,
          "analytics-settings",
          "session-settings",
          MemotronAction.NODE_SETTINGS,
          Action.DATETIME_SETTINGS,
          Action.SHORTCUTS,
          Action.ACCESSIBILITY
        ],
        section: "customization"
      },
      {
        children: [
          "about",
          "green",
          "share",
          "guides",
          "feedback",
          "privacy",
          "discord"
        ],
        isHideTitle: true,
        section: "other"
      }
    ]
  },
  [Product.MEMOTRON]: {
    ...resolveBaseSharedProductConfig(Product.MEMOTRON),
    appMenu: [...memotronNav.appMenu],
    appMenuPt: [...memotronNav.appMenuPt],
    homePath: memotronNav.homePath,
    homePathPt: memotronNav.homePathPt,
    isShowCaptureOnMobile: true,
    resources: {
      browse: [Resource.node, Resource.collection],
      table: [
        ...commonTables,
        ...resourceTableMap[Product.MEMOTRON],
        ...linkabilityTables,
        ...filesAbilityTables
      ]
    },
    librarySectionLabel: memotronNav.librarySectionLabel,
    configurableShortcuts: [
      ...commonConfigurableShortcuts,
      "SAVE_CAPTURE_SHORTCUT",
      "ACTIVATE_LINK_BOX"
    ],
    settings: [
      {
        children: [
          MemotronAction.RELATIONS_AS_SETTINGS,
          Action.SYNC_SETTINGS,
          Action.ARTIFICIAL_INTELLIGENCE,
          Action.DATA_SETTINGS,
          Action.USER_BILLING
        ],
        isHideTitle: true,
        orientation: "horizontal",
        section: "app"
      },
      {
        children: [
          Action.MODE_OF_INTERACTION,
          Action.APPEARANCE_SETTINGS,
          MemotronAction.NODE_SETTINGS,
          Action.DATETIME_SETTINGS,
          Action.SHORTCUTS,
          Action.ACCESSIBILITY
        ],
        section: "customization"
      },
      {
        children: [
          "about",
          "green",
          "share",
          "guides",
          "feedback",
          "privacy",
          "discord"
        ],
        isHideTitle: true,
        section: "other"
      }
    ]
  },
  [Product.POINTRON]: {
    ...resolveBaseSharedProductConfig(Product.POINTRON),
    appMenu: [...pointronNav.appMenu],
    appMenuPt: [...pointronNav.appMenuPt],
    homePath: pointronNav.homePath,
    homePathPt: pointronNav.homePathPt,
    resources: {
      browse: [
        Resource.goal,
        Resource.task,
        Resource.collection,
        Resource.event
      ],
      table: [
        ...commonTables,
        ...resourceTableMap[Product.POINTRON],
        ...linkabilityTables
      ]
    },
    librarySectionLabel: pointronNav.librarySectionLabel,
    settings: [
      {
        children: [
          Action.SYNC_SETTINGS,
          Action.DATA_SETTINGS,
          Action.USER_BILLING
        ],
        isHideTitle: true,
        orientation: "horizontal",
        section: "app"
      },
      {
        children: [
          Action.MODE_OF_INTERACTION,
          Action.APPEARANCE_SETTINGS,
          "analytics-settings",
          "session-settings",
          Action.DATETIME_SETTINGS,
          Action.SHORTCUTS,
          Action.ACCESSIBILITY
        ],
        section: "customization"
      },
      {
        children: [
          "about",
          "green",
          "share",
          "guides",
          "feedback",
          "privacy",
          "discord"
        ],
        isHideTitle: true,
        section: "other"
      }
    ]
  },
  ...nextProducts
};

const tableConfigMapper = (resource: Resource) => {
  const config = resourceConfig[resource];
  if (!config) return null;
  return {
    ...config,
    indices: ["id", "createdAt", "modifiedAt", ...(config.indices ?? [])]
  };
};

export const product =
  import.meta.env?.VITE_PRODUCT ||
  (typeof process !== "undefined"
    ? process.env?.PLASMO_PUBLIC_PRODUCT
    : undefined) ||
  Product.NUCLEUM;

export const resolveProductConfig = (productOverride?: Product): IAppConfig => {
  const base = products[productOverride ?? (product as Product)];
  if (!base) {
    throw new Error(`Unknown product: ${productOverride ?? product}`);
  }
  return {
    ...base,
    oAuthProviders: ["google", "apple", "github"],
    tableConfig: base.resources.table
      .map(tableConfigMapper)
      .filter((item) => item != null)
  };
};

const extensions: Record<Extension, IProductConfigBase> = {
  [Extension.MEMOTRON_CLIPPER]: {
    name: "Memotron Clipper",
    resources: {
      browse: [],
      table: [
        ...commonTables,
        ...resourceTableMap[Product.MEMOTRON],
        ...linkabilityTables,
        ...filesAbilityTables
      ]
    },
    displayName: "Memotron Clipper",
    tagline: ""
  },
  [Extension.MEMOTRON_SHARE]: {
    name: "Memotron Share",
    resources: {
      browse: [],
      table: []
    },
    displayName: "Memotron Share",
    tagline: ""
  }
};

export const resolveExtensionConfig = (
  productOverride?: Extension
): IExtensionConfig => {
  const resolvedProduct = productOverride ?? (product as Extension);
  const base = extensions[resolvedProduct];
  if (!base) {
    throw new Error(`Unknown extension: ${resolvedProduct}`);
  }
  return {
    ...base,
    tableConfig: base.resources.table
      .map(tableConfigMapper)
      .filter((item) => item != null)
  };
};
