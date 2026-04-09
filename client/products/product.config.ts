import { Extension, OverviewPanel, Product } from "@21n/products/product.type";
import { getProductNavConfig } from "./product-nav.config";
import { productE2EConfigs } from "./product.e2e-config";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { Action } from "@21n/types/action.enum";
import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
import { resourceConfig } from "@21n/components/flux/resourceStores/resource.config";
import type { IResourceTableConfig } from "@21n/components/flux/flux.type";
import type { ISelectItem } from "@21n/types/select.type";
import { nextProducts, nextResourceTableMap, nextNucleusOverviewPanelSwitcherItems } from "@21n/next/product.config";

const isDev = import.meta.env?.DEV || false;

interface SettingsSection {
  children: (Action | MemotronAction | string)[];
  isHideTitle?: boolean;
  orientation?: "horizontal" | "vertical";
  section: string;
}

export interface IProductE2ECapabilities {
  ui?: {
    pinnedResourceBrowser?: boolean;
  };
  commands?: {
    directGoalLibraryCommand?: boolean;
    focus?: boolean;
    manualTimeEntry?: boolean;
  };
  calendar?: {
    manualLogUiEntry?: boolean;
    dateNavigation?: boolean;
  };
  overview?: {
    focusAnalyticsDashboard?: boolean;
    memoryPanelSwitch?: boolean;
  };
  settings?: {
    focusPanel?: boolean;
    nodeSettingsPanel?: boolean;
    sharedSidebarSmoke?: boolean;
    sharedModeOfInteraction?: boolean;
    sharedHotKeyMatrix?: boolean;
    sharedShortcutCustomization?: boolean;
    focusPipToggle?: boolean;
  };
  records?: {
    collection?: boolean;
    collectionTabs?: boolean;
    collectionRename?: boolean;
    goal?: boolean;
    goalTabs?: boolean;
    task?: boolean;
    taskTabs?: boolean;
    node?: boolean;
    nodeTabs?: boolean;
    session?: boolean;
  };
}

interface IProductConfigBase {
  name: string;
  resources: {
    /**
     * Resources that are visible to user and browsable from Library, searchable from Search.
     */
    browse: Resource[];
    table: Resource[];
  };
  displayName: string;
  tagline: string;
  e2eCapabilities?: IProductE2ECapabilities;
}

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
  /**
   * Used in cases like Surreal persistence
   */
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
  [Product.NUCLEUS]: [Resource.event, Resource.combination],
  [Product.MEMOTRON]: [Resource.node, Resource.capture],
  [Product.POINTRON]: [
    Resource.goal,
    Resource.task,
    Resource.session,
    Resource.sessionLog
  ],
  ...nextResourceTableMap,
};

const nucleusNav = getProductNavConfig(Product.NUCLEUS);
const memotronNav = getProductNavConfig(Product.MEMOTRON);
const pointronNav = getProductNavConfig(Product.POINTRON);

export const products: Record<string, IAppConfigBase> = {
  [Product.NUCLEUS]: {
    name: "Nucleum",
    appMenu: (isDev && nucleusNav.appMenuDev
      ? nucleusNav.appMenuDev
      : nucleusNav.appMenu) as string[],
    appMenuPt: [...nucleusNav.appMenuPt],
    homePath: nucleusNav.homePath,
    homePathPt: nucleusNav.homePathPt,
    databaseName: "nativeone",
    resources: {
      browse: [Resource.collection, Resource.combination, Resource.event],
      table: [
        ...commonTables,
        ...Array.from(Object.values(resourceTableMap)).flat(),
        ...linkabilityTables,
        ...filesAbilityTables,
        Resource.combination
      ]
    },
    librarySectionLabel: nucleusNav.librarySectionLabel,
    displayName: "Nucleum",
    tagline: "Your digital harmony",
    configurableShortcuts: [
      ...commonConfigurableShortcuts,
      "SAVE_CAPTURE_SHORTCUT",
      "ACTIVATE_LINK_BOX"
    ],
    overviewPanelSwitcherItems: [
      { label: "Focus", value: OverviewPanel.FOCUS, icon: "circle" },
      { label: "Memory", value: OverviewPanel.MEMORY, icon: "hexagon" },
      ...nextNucleusOverviewPanelSwitcherItems
    ],
    e2eCapabilities: productE2EConfigs.nucleus.capabilities,
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
    name: "Memotron",
    appMenu: [...memotronNav.appMenu],
    appMenuPt: [...memotronNav.appMenuPt],
    homePath: memotronNav.homePath,
    homePathPt: memotronNav.homePathPt,
    isShowCaptureOnMobile: true,
    databaseName: "nativeone",
    resources: {
      browse: [Resource.node, Resource.collection, Resource.combination],
      table: [
        ...commonTables,
        ...resourceTableMap[Product.MEMOTRON],
        ...linkabilityTables,
        ...filesAbilityTables
      ]
    },
    librarySectionLabel: memotronNav.librarySectionLabel,
    displayName: "Memotron",
    tagline: "Your memory partner",
    configurableShortcuts: [
      ...commonConfigurableShortcuts,
      "SAVE_CAPTURE_SHORTCUT",
      "ACTIVATE_LINK_BOX"
    ],
    e2eCapabilities: productE2EConfigs.memotron.capabilities,
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
    name: "Pointron",
    appMenu: [...pointronNav.appMenu],
    appMenuPt: [...pointronNav.appMenuPt],
    homePath: pointronNav.homePath,
    homePathPt: pointronNav.homePathPt,
    databaseName: "pointone",
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
    displayName: "Pointron",
    tagline: "Your focus haven",
    e2eCapabilities: productE2EConfigs.pointron.capabilities,
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
  ...nextProducts,
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
  (typeof process !== "undefined" ? process.env?.PLASMO_PUBLIC_PRODUCT : undefined) ||
  Product.NUCLEUS;

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
      .filter((x) => x != null)
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
  const base = extensions[productOverride ?? (product as Extension)];
  return {
    ...base,
    tableConfig: base.resources.table
      .map(tableConfigMapper)
      .filter((x) => x != null)
  };
};
