import { Product } from "./product.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { product } from "$local/local";

const isDev = import.meta.env.DEV;

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
  databaseName: string;
  resources: Resource[];
  sectionLabel: string;
  displayName: string;
  tagline: string;
  features: {
    fileUploadAvailable: boolean;
  };
}

export const products: Record<Product, ProductConfig> = {
  [Product.NUCLEUS]: {
    appMenu: isDev
      ? ["home", "calendar", "overview", "library"]
      : ["calendar", "overview", "library"],
    appMenuPt: [],
    homePath: "calendar",
    homePathPt: "mobilehome",
    databaseName: "nativeone",
    resources: [Resource.collection],
    sectionLabel: "Nucleus",
    displayName: "Nucleus",
    tagline: "Your digital harmony",
    features: {
      fileUploadAvailable: true
    }
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
    }
  },
  [Product.POINTRON]: {
    appMenu: ["focus", "calendar", "overview", "library"],
    appMenuPt: ["overview", "calendar", "focus", "library"],
    homePath: "calendar",
    homePathPt: "mobilehome",
    databaseName: "pointone",
    resources: [Resource.goal, Resource.task],
    sectionLabel: "Focus",
    displayName: "Pointron",
    tagline: "Your focus haven",
    features: {
      fileUploadAvailable: false
    }
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
