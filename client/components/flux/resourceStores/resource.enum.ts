export enum Resource {
  ALL = "ALL",
  unknown = "unknown",
  /**
   * Meta resource for everything
   */
  everything = "everything",
  globalPreferences = "globalPreferences",
  TailwindTheme = "TailwindTheme",
  appData = "appData",
  space = "space",
  spaceInContext = "spaceInContext",
  appearance = "appearance",
  tz = "tz",
  kv = "kv",
  appMenu = "appMenu",
  accessLog = "accessLog",
  uiState = "uiState",
  keyboardShortcuts = "keyboardShortcuts",
  mutation = "mutation",
  event = "event",
  tag = "tag",
  /**
   * @deprecated - use {@link task} instead
   */
  todo = "todo",

  //Pointron
  pointronPreferences = "pointronPreferences",
  SessionStore = "SessionStore",
  SessionStoreV2 = "SessionStoreV2",
  pointSessionSnapshot = "pointSessionSnapshot",
  pointSessionFocusItems = "pointSessionFocusItems",
  pointSessionSnapshotv2 = "pointSessionSnapshotv2",
  /**
   * @deprecated - use {@link sessionFocusItems} instead
   */
  pointSessionFocusItemsv2 = "pointSessionFocusItemsv2",
  /**
   * @deprecated - use {@link session} instead
   */
  PointSession = "PointSession",
  /**
   * @deprecated - use {@link todo} instead
   */
  PointTask = "PointTask",
  /**
   * @deprecated - no longer supported
   */
  PointTag = "PointTag",
  /**
   * @deprecated - use {@link sessionLog} instead
   */
  PointLog = "PointLog",
  PointTimer = "PointTimer",
  /**
   * @deprecated - use {@link task} instead
   */
  PointGoal = "PointGoal",
  goal = "goal",
  logsPane = "logsPane",
  targetsPane = "targetsPane",
  focusHeatmap = "focusHeatmap",
  pointAnalyticsConfig = "pointAnalyticsConfig",
  quickFocusItems = "quickFocusItems",
  task = "task",
  habit = "habit",
  session = "session",
  sessionLog = "sessionLog",
  sessionFocusItems = "sessionFocusItems",
  //Memotron
  vector = "vector",
  node = "node",
  relation = "relation",
  curation = "curation",
  type = "type",
  property = "property",
  collection = "collection",
  combination = "combination",
  nodelinks = "nodelinks",
  capture = "capture",
  view = "view",
  file = "file",
  highlight = "highlight",
  link = "link",
  linkTag = "linkTag",
  markdownSettings = "markdownSettings",

  //Memotron clipper
  clipperToolbarState = "clipperToolbarState",
  clipperSync = "clipperSync",

  //Feedtron
  feed = "feed",
  source = "source",

  //Hometron
  thing = "thing",

  //Finatron
  account = "account",
  transaction = "transaction"
}
