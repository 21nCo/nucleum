import { NextProduct } from "./product.type";
import { NextResource } from "./resource.enum";
import type { IAppConfigBase } from "@21n/products/product.config";
import type { ISelectItem } from "@21n/types/select.type";
import { OverviewPanel } from "@21n/products/product.type";

export const nextProducts: Record<NextProduct, IAppConfigBase> = {
  [NextProduct.FELLOTRON]: {
    name: "Fellotron",
    appMenu: [],
    appMenuPt: [],
    homePath: "",
    homePathPt: "",
    databaseName: "fellone",
    resources: {
      browse: [NextResource.email, NextResource.fellow],
      table: []
    },
    displayName: "Fellotron",
    librarySectionLabel: "Communication",
    tagline: ""
  },
  [NextProduct.FINATRON]: {
    name: "Finatron",
    appMenu: [],
    appMenuPt: [],
    homePath: "",
    homePathPt: "",
    databaseName: "finone",
    resources: {
      browse: [NextResource.account, NextResource.transaction, NextResource.budget],
      table: []
    },
    displayName: "Finatron",
    librarySectionLabel: "Finance",
    tagline: ""
  },
  [NextProduct.FEEDTRON]: {
    name: "Feedtron",
    appMenu: [],
    appMenuPt: [],
    homePath: "",
    homePathPt: "",
    databaseName: "feedone",
    resources: {
      browse: [NextResource.feed, NextResource.source],
      table: []
    },
    displayName: "Feedtron",
    librarySectionLabel: "Feed",
    tagline: ""
  },
  [NextProduct.SELFTRON]: {
    name: "Selftron",
    appMenu: [],
    appMenuPt: [],
    homePath: "",
    homePathPt: "",
    databaseName: "selfone",
    resources: {
      browse: [NextResource.habit, NextResource.activity, NextResource.quest],
      table: []
    },
    displayName: "Selftron",
    librarySectionLabel: "Self",
    tagline: ""
  }
};

export const nextResourceTableMap: Record<NextProduct, NextResource[]> = {
  [NextProduct.FELLOTRON]: [
    NextResource.email,
    NextResource.fellow,
    NextResource.organization
  ],
  [NextProduct.FINATRON]: [],
  [NextProduct.FEEDTRON]: [],
  [NextProduct.SELFTRON]: [],
};

/**
 * Private product sections to insert before Memotron in the library switcher.
 */
export const nextProductSectionsPre: string[] = [NextProduct.SELFTRON];

/**
 * Private product sections to insert after Memotron in the library switcher.
 */
export const nextProductSectionsPost: string[] = [
  NextProduct.FELLOTRON,
  NextProduct.FINATRON,
  NextProduct.FEEDTRON,
];

export const nextNucleusOverviewPanelSwitcherItems: ISelectItem[] = [
  {
    label: nextProducts[NextProduct.SELFTRON].librarySectionLabel,
    value: OverviewPanel.SELF,
    icon: "heart"
  },
  {
    label: nextProducts[NextProduct.FINATRON].librarySectionLabel,
    value: OverviewPanel.FINANCE,
    icon: "ph:bank-light"
  }
];