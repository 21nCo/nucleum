import type { IAction } from "$lib/client/types/action.type";
import type { InteractionMode } from "../components/settings/interactionMode/interactionMode.type";
import type { IMetadata } from "../layout/metadata.type";
import type { Product } from "./product.type";
export type IAppStore = {
  product: Product;
  env: string;
  version: string;
  build: number;
  appData: IAppData;
  isDebugMode: boolean;
  isExperimentalMode: boolean;
  isDnDPageActive?: boolean;
  pageMenu?: string[];
  //TACO - dynamic actions
  dynamicBlocks?: IAction[];
  currentPath: string;
  isMenuHidden?: boolean;
  currentComponent?: IAction;
  sheetPath?: string;
  actions: IAction[];
  /**
   * Derived value from uiState. This is to avoid the dependency of appStore on uiState as appStore is used non-logged in user context.
   */
  interactionMode: InteractionMode;
};

export type IAppData = {
  name: string;
  /**
   * @deprecated - use availability instead
   */
  version: string;
  /**
   * @deprecated - use release instead
   */
  updated?: string;
  release?: any;
  availability?: any;
  help?: any;
  cp?: any;
  shortcuts?: any;
  configurableShortcuts?: string[];
  appMenu?: string[];
  appMenuMobile?: string[];
  oAuthConfig?: any[];
  isAnalyticsEnabled?: boolean;
  isCmdBarEnabled?: boolean;
  isShowCaptureOnMobile?: boolean;
  leftPanelFooter?: string;
  bottomRightAction?: string;
  auth?: {
    isInviteOnly?: boolean;
  };
  /**
   * @deprecated
   */
  md?: Record<string, string>;
  /**
   * @deprecated
   */
  about?: string;
  /**
   * @deprecated
   */
  env?: Record<string, any>;
  urls: {
    discord: string;
    soft: string;
    landing?: string;
    earlyAccess?: string;
    kbLinkTags?: string;
    chromeExtension?: string;
    docs?: string;
    guides?: string;
    onboardingVideo?: string;
    supahub?: string;
    hashnode?: string;
    statusPage?: string;
    systemStatusJson?: string;
    systemStatusEmbed?: string;
    changelogEmbed?: string;
    roadmapEmbed?: string;
    privacy?: string;
    [key: string]: string | undefined;
  };
  meta?: IMetadata;
};

export enum AppSearchParam {
  EDIT = "edit",
  TYPE = "type",
  /**
   * Should be used only with some prefix like recordId etc... Otherwise it will conflict with ResourceAccessMode.TAB
   */
  TAB = "tab",
  VIEW = "view",
  LINK = "link",
  BULK = "bulk",
  MODE = "mode",
  CLIPBOARD = "clipboard",
  RESOURCE = "resource",
  STARRED = "starred",
  ARCHIVED = "archived",
  DATE = "date",
  SETTING = "setting",
  CODE = "code",
  TOKEN = "token",
  MSG = "msg",
  EXT = "ext",
  PROVIDER = "provider",
  GUEST = "guest",
  POP_AT = "popAt",
  FSPLIT_AT = "fsplitAt",
  FULL_AT = "fullAt"
}
