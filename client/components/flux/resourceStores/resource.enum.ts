export enum Resource {
  ALL = "ALL",
  unknown = "unknown",
  /**
   * Meta resource for everything
   */
  everything = "everything",
  globalPreferences = "globalPreferences",
  preferences = "preferences",
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
  import = "import",
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
  session = "session",
  sessionLog = "sessionLog",
  sessionFocusItems = "sessionFocusItems",

  //Global
  collection = "collection",
  property = "property",
  view = "view",
  combination = "combination",
  file = "file",
  place = "place",
  input = "input",

  //Memotron
  /**
   * @deprecated - use {@link collection} instead
   */
  curation = "curation",
  nodelinks = "nodelinks",
  capture = "capture",
  /**
   * @deprecated - use {@link collection} instead
   */
  type = "type",
  vector = "vector",
  node = "node",
  relation = "relation",
  link = "link",
  linkTag = "linkTag",
  markdownSettings = "markdownSettings",

  //Memotron clipper
  highlight = "highlight",
  clipperToolbarState = "clipperToolbarState",
  clipperSync = "clipperSync",

  //Selftron
  habit = "habit",
  quest = "quest",

  //Feedtron
  feed = "feed",
  source = "source",

  //Hometron
  thing = "thing",

  //Finatron
  account = "account",
  transaction = "transaction",

  //Fellotron
  fellow = "fellow"
}

/**
 * For system purposes only. Example: rendering indicators in Calendar etc. Not stores in the database.
 */
export enum MetaResource {
  calendarNotes = "calendarNotes"
}
