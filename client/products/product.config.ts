import { Product } from "./product.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { product } from "$local/local";
import { Action } from "../types/action.enum";
import { MemotronAction } from "./memotron/memotronAction.enum";

const isDev = import.meta.env.DEV;

interface SettingsSection {
  children: (Action | MemotronAction | string)[];
  isHideTitle?: boolean;
  orientation?: "horizontal" | "vertical";
  section: string;
}

interface ProductConfig {
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
  databaseName: string;
  resources: Resource[];
  sectionLabel: string;
  displayName: string;
  tagline: string;
  configurableShortcuts?: string[];
  features: {
    fileUploadAvailable: boolean;
  };
}

const commonConfigurableShortcuts = [
  Action.EDIT_MODE,
  Action.CMD,
  Action.GLOBAL_SEARCH,
  Action.GO_BACK,
  Action.GO_FORWARD
];

export const products: Record<Product, ProductConfig> = {
  [Product.NUCLEUS]: {
    appMenu: isDev
      ? ["home", "calendar", "overview", "library"]
      : ["calendar", "overview", "library"],
    appMenuPt: [],
    homePath: "calendar",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: [Resource.collection, Resource.combination, Resource.event],
    sectionLabel: "Nucleus",
    displayName: "Nucleus",
    tagline: "Your digital harmony",
    features: {
      fileUploadAvailable: true
    },
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
    appMenu: ["node_create", "calendar", "overview", "library"],
    appMenuPt: [],
    homePath: "calendar",
    homePathPt: "mobilehome",
    isShowCaptureOnMobile: true,
    databaseName: "nativeone",
    resources: [Resource.node, Resource.relation],
    sectionLabel: "Memory",
    displayName: "Memotron",
    tagline: "Your memory partner",
    features: {
      fileUploadAvailable: true
    },
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
    appMenu: ["focus", "calendar", "overview", "library"],
    appMenuPt: ["overview", "calendar", "focus", "library"],
    homePath: "calendar",
    homePathPt: "focus",
    databaseName: "pointone",
    resources: [Resource.goal, Resource.task],
    sectionLabel: "Focus",
    displayName: "Pointron",
    tagline: "Your focus haven",
    features: {
      fileUploadAvailable: false
    },
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
    appMenu: ["overview", "library"],
    appMenuPt: [],
    homePath: "home",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: [Resource.habit, Resource.quest, Resource.input],
    sectionLabel: "Self",
    displayName: "Selftron",
    tagline: "Your self improvement",
    features: {
      fileUploadAvailable: false
    }
  },
  [Product.FEEDTRON]: {
    appMenu: ["overview", "library"],
    appMenuPt: [],
    homePath: "feed",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: [Resource.source, Resource.feed],
    sectionLabel: "Feed",
    displayName: "Feedtron",
    tagline: "Your feed curator",
    features: {
      fileUploadAvailable: false
    }
  },
  [Product.HOMETRON]: {
    appMenu: ["overview", "library"],
    appMenuPt: [],
    homePath: "home",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: [Resource.thing, Resource.place],
    sectionLabel: "Home",
    displayName: "Hometron",
    tagline: "Your home manager",
    features: {
      fileUploadAvailable: false
    }
  },
  [Product.FINATRON]: {
    appMenu: ["overview", "library"],
    appMenuPt: [],
    homePath: "home",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: [Resource.account],
    sectionLabel: "Finance",
    displayName: "Finatron",
    tagline: "Your financial assistant",
    features: {
      fileUploadAvailable: false
    }
  },
  [Product.FELLOTRON]: {
    appMenu: ["overview", "library"],
    appMenuPt: [],
    homePath: "home",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: [Resource.fellow],
    sectionLabel: "Fellow",
    displayName: "Fellotron",
    tagline: "Your fellow tracker",
    features: {
      fileUploadAvailable: false
    }
  }
};

export const resolveProductConfig = (
  productOverride?: Product
): ProductConfig => {
  return products[productOverride ?? (product as Product)];
};
