import type { IAction } from "@21n/types/action.type";
import type { InteractionMode } from "@21n/components/settings/interactionMode/interactionMode.type";
import type { IMetadata } from "@21n/layout/metadata.type";
import type { Product } from "@21n/types/product.type";
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
  /**
   * @deprecated - use product.config instead
   */
  cp?: any;
  shortcuts?: any;
  /**
   * @deprecated - use product.config instead
   */
  configurableShortcuts?: string[];
  /**
   * @deprecated - use product.config instead
   */
  appMenu?: string[];
  /**
   * @deprecated - use product.config instead
   */
  appMenuMobile?: string[];
  oAuthConfig?: any[];
  isAnalyticsEnabled?: boolean;
  isCmdBarEnabled?: boolean;
  /**
   * @deprecated - use product.config instead
   */
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
    appStore?: string;
    microsoftStore?: string;
    playStore?: string;
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
  RETURN_TO = "returnTo",
  BACK = "back",
  EDIT = "edit",
  TYPE = "type",
  /**
   * Should be used only with some prefix like recordId etc... Otherwise it will conflict with ResourceAccessMode.TAB
   */
  TAB = "tab",
  PANEL = "panel",
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
  SPLIT_AT = "splitAt",
  FULL_AT = "fullAt",
  DEPTH = "depth",
  TRAVERSE = "traverse",
  NODE_VIEW = "nodeView",
  SEARCH = "search",
  RIGHT = "right"
}

export enum Context {
  CONTAINER = "container",
  NODE = "node",
  MARKDOWN = "markdown",
  CONTENT = "content",
  CAPTURE = "capture",
  BLOCK = "block",
  CALENDAR_CONTENT = "calendar-content"
}
