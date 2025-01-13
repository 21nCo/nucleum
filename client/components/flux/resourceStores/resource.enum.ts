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

  //Pointron
  pointronPreferences = "pointronPreferences",
  SessionStore = "SessionStore",
  SessionStoreV2 = "SessionStoreV2",
  pointSessionSnapshot = "pointSessionSnapshot",
  pointSessionFocusItems = "pointSessionFocusItems",
  pointSessionSnapshotv2 = "pointSessionSnapshotv2",
  pointSessionFocusItemsv2 = "pointSessionFocusItemsv2",
  Routine = "Routine",
  CurrentTask = "CurrentTask",
  PointSession = "PointSession",
  PointTask = "PointTask",
  PointTag = "PointTag",
  PointLog = "PointLog",
  PointTimer = "PointTimer",
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
  taskTag = "taskTag",
  //Memotron
  vector = "vector",
  node = "node",
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
