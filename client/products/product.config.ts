import { Extension, Product } from "@21n/products/product.type";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { Action } from "@21n/types/action.enum";
import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
import { resourceConfig } from "@21n/components/flux/resourceStores/resource.config";
import type { IResourceTableConfig } from "@21n/components/flux/flux.type";

const isDev = import.meta.env?.DEV || false;

interface SettingsSection {
  children: (Action | MemotronAction | string)[];
  isHideTitle?: boolean;
  orientation?: "horizontal" | "vertical";
  section: string;
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
}

interface IAppConfigBase extends IProductConfigBase {
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
  Action.GLOBAL_SEARCH,
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

const resourceTableMap: Record<Product, Resource[]> = {
  [Product.NUCLEUS]: [Resource.event, Resource.combination],
  [Product.MEMOTRON]: [Resource.node, Resource.capture],
  [Product.POINTRON]: [
    Resource.goal,
    Resource.task,
    Resource.session,
    Resource.sessionLog
  ],
  [Product.SELFTRON]: [],
  [Product.FEEDTRON]: [],
  [Product.HOMETRON]: [],
  [Product.FINATRON]: [],
  [Product.FELLOTRON]: []
};

export const products: Record<Product, IAppConfigBase> = {
  [Product.NUCLEUS]: {
    name: "Nucleus",
    appMenu: isDev
      ? ["home", "calendar", "overview", "library"]
      : ["calendar", "overview", "library"],
    appMenuPt: ["calendar", "librarypt", "overview"],
    homePath: "calendar",
    homePathPt: "librarypt",
    databaseName: "nativeone",
    resources: {
      browse: [Resource.collection, Resource.combination, Resource.event],
      table: [
        ...commonTables,
        ...Array.from(Object.values(resourceTableMap)).flat(),
        ...linkabilityTables,
        ...filesAbilityTables
      ]
    },
    librarySectionLabel: "Nucleus",
    displayName: "Nucleus",
    tagline: "Your digital harmony",
    configurableShortcuts: [
      ...commonConfigurableShortcuts,
      "SAVE_CAPTURE_SHORTCUT",
      "ACTIVATE_LINK_BOX"
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
    name: "Memotron",
    appMenu: ["node_create", "calendar", "overview", "library"],
    appMenuPt: [],
    homePath: "calendar",
    homePathPt: "mobilehome",
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
    librarySectionLabel: "Memory",
    displayName: "Memotron",
    tagline: "Your memory partner",
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
    name: "Pointron",
    appMenu: ["focus", "calendar", "overview", "library"],
    appMenuPt: ["overview", "calendar", "focus", "librarypt"],
    homePath: "calendar",
    homePathPt: "focus",
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
    librarySectionLabel: "Focus",
    displayName: "Pointron",
    tagline: "Your focus haven",
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
  [Product.SELFTRON]: {
    name: "Selftron",
    appMenu: ["overview", "library"],
    appMenuPt: [],
    homePath: "home",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: {
      browse: [Resource.habit, Resource.quest, Resource.input],
      table: [...commonTables, ...resourceTableMap[Product.SELFTRON]]
    },
    librarySectionLabel: "Self",
    displayName: "Selftron",
    tagline: "Your self improvement"
  },
  [Product.FEEDTRON]: {
    name: "Feedtron",
    appMenu: ["overview", "library"],
    appMenuPt: [],
    homePath: "feed",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: {
      browse: [Resource.source, Resource.feed],
      table: [...commonTables, ...resourceTableMap[Product.FEEDTRON]]
    },
    librarySectionLabel: "Feed",
    displayName: "Feedtron",
    tagline: "Your feed curator"
  },
  [Product.HOMETRON]: {
    name: "Hometron",
    appMenu: ["overview", "library"],
    appMenuPt: [],
    homePath: "home",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: {
      browse: [Resource.thing, Resource.place],
      table: [...commonTables, ...resourceTableMap[Product.HOMETRON]]
    },
    librarySectionLabel: "Home",
    displayName: "Hometron",
    tagline: "Your home manager"
  },
  [Product.FINATRON]: {
    name: "Finatron",
    appMenu: ["overview", "library"],
    appMenuPt: [],
    homePath: "home",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: {
      browse: [Resource.account],
      table: [...commonTables, ...resourceTableMap[Product.FINATRON]]
    },
    librarySectionLabel: "Finance",
    displayName: "Finatron",
    tagline: "Your financial assistant"
  },
  [Product.FELLOTRON]: {
    name: "Fellotron",
    appMenu: ["overview", "library"],
    appMenuPt: [],
    homePath: "home",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: {
      browse: [Resource.fellow],
      table: [...commonTables, ...resourceTableMap[Product.FELLOTRON]]
    },
    librarySectionLabel: "Fellow",
    displayName: "Fellotron",
    tagline: "Your fellow tracker"
  }
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
  process.env.PLASMO_PUBLIC_PRODUCT ||
  Product.NUCLEUS;

export const resolveProductConfig = (productOverride?: Product): IAppConfig => {
  const base = products[productOverride ?? (product as Product)];
  return {
    ...base,
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
