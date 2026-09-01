export enum ClientStorageKey {
  ENV = "env",
  PRODUCT = "product",
  IS_EXTENSION_LOGIN = "isExtensionLogin",
  EMBED_OAUTH = "embedOAuth",
  APP_DATA = "appData",
  STOKEN = "stoken",
  USER = "user",
  AUTHFN_TOKEN = "authfnToken",
  AUTHFN_WIDGET_TOKEN = "authfnWidgetToken",
  REGION = "region",
  USER_REGION_MAP = "userRegionMap",
  USER_INFO = "userInfo",
  USER_PLAN = "userPlan",
  /**
   * @deprecated - use userId instead
   */
  GUEST = "guest",
  SPACE_IN_CONTEXT = "spaceInContext",
  OFFLINE_SESSION_ID = "offlineSessionId",
  /**
   * Device access point id. This id will be unique for each access point on a given device. Ex: different broswer logins, macOS app login etc.
   *
   * This is used to determine the need for cloning cloud db to local db if logged in from different access points.
   *
   */
  DAP_ID = "dapId",

  INTERCOM_ID = "intercomId",
  OFFLINE_MODE = "offlineMode",
  DATAFN_OFFLINABILITY = "datafnOfflinability",
  DATAFN_E2EE_SETTINGS = "datafnE2eeSettings",
  DATAFN_E2EE_LOCAL_KEYS = "datafnE2eeLocalKeys",
  LEGACY_LOCAL_DATA_RECOVERY = "legacyLocalDataRecovery",
  LOW_DATA_MODE = "lowDataMode",
  /**
   * Clipper extension toolbar state for guest users.
   */
  GUEST_TOOLBAR_STATE = "guestToolbarState",
  /**
   * Tracks which fallback functions have been run to prevent re-execution
   */
  FALLBACKS_RUN_STATUS = "fallbacksRunStatus",
  /**
   * Used to store recent items for the clipper extension.
   */
  RECENTS = "recents",
  /**
   * Used to track the bootup status of the extension.
   */
  EXTENSION_BOOTUP = "extensionBootup",
  LAST_INDEXED_AT = "lastIndexedAt",
  TABLES = "tables"
}
