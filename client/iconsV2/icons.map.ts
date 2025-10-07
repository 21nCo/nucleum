export interface IconMapping {
  phosphor: string;
  lucide: string;
  solar?: string;
}

export const iconMappings: Record<string, IconMapping> = {
  // Navigation and Actions
  home: {
    phosphor: "house",
    lucide: "home",
    solar: "home"
  },
  bolt: {
    phosphor: "lightning",
    lucide: "zap",
    solar: "bolt"
  },
  settings: {
    phosphor: "gear",
    lucide: "settings",
    solar: "settings"
  },
  plus: {
    phosphor: "plus",
    lucide: "plus",
    solar: "add"
  },
  minus: {
    phosphor: "minus",
    lucide: "minus",
    solar: "minus"
  },
  cross: {
    phosphor: "x",
    lucide: "x",
    solar: "close"
  },
  check: {
    phosphor: "check",
    lucide: "check",
    solar: "check"
  },
  funnel: {
    phosphor: "funnel",
    lucide: "funnel",
    solar: "filter"
  },

  // Arrows
  "arrow-left": {
    phosphor: "arrow-left",
    lucide: "arrow-left",
    solar: "arrow-left"
  },
  proceed: {
    phosphor: "arrow-right",
    lucide: "arrow-right",
    solar: "arrow-right"
  },
  "arrow-up": {
    phosphor: "arrow-up",
    lucide: "arrow-up",
    solar: "arrow-up"
  },
  "arrow-down": {
    phosphor: "arrow-down",
    lucide: "arrow-down",
    solar: "arrow-down"
  },
  weblink: {
    phosphor: "arrow-up-right",
    lucide: "arrow-up-right",
    solar: "arrow-up-right"
  },
  "weblink-two": {
    phosphor: "arrow-square-out",
    lucide: "external-link",
    solar: "link-round-angle"
  },
  incoming: {
    phosphor: "arrow-down-left",
    lucide: "arrow-down-left",
    solar: "arrow-down-left"
  },
  outgoing: {
    phosphor: "arrow-up-right",
    lucide: "arrow-up-right",
    solar: "arrow-up-right"
  },
  "arrow-arc-left": {
    phosphor: "arrow-arc-left",
    lucide: "arrow-up-left",
    solar: "arrow-up-left"
  },
  "arrow-circle-right": {
    phosphor: "arrow-circle-right",
    lucide: "arrow-right-circle",
    solar: "arrow-right-circle"
  },

  // Chevrons
  "chevron-left": {
    phosphor: "caret-left",
    lucide: "chevron-left",
    solar: "alt-arrow-left"
  },
  "chevron-right": {
    phosphor: "caret-right",
    lucide: "chevron-right",
    solar: "alt-arrow-right"
  },
  "chevron-up": {
    phosphor: "caret-up",
    lucide: "chevron-up",
    solar: "alt-arrow-up"
  },
  "chevron-down": {
    phosphor: "caret-down",
    lucide: "chevron-down",
    solar: "alt-arrow-down"
  },

  // Core Shapes and Elements
  circle: {
    phosphor: "circle",
    lucide: "circle",
    solar: "circle"
  },
  hexagon: {
    phosphor: "hexagon",
    lucide: "hexagon",
    solar: "hexagon"
  },
  square: {
    phosphor: "square",
    lucide: "square",
    solar: "square"
  },

  // Content and Media
  image: {
    phosphor: "image",
    lucide: "image",
    solar: "gallery"
  },
  video: {
    phosphor: "video",
    lucide: "video",
    solar: "video-library"
  },
  music: {
    phosphor: "music-note",
    lucide: "music",
    solar: "music-note"
  },
  file: {
    phosphor: "file",
    lucide: "file",
    solar: "file"
  },
  "file-pdf": {
    phosphor: "file-pdf",
    lucide: "file-text",
    solar: "file-text"
  },

  // Actions
  edit: {
    phosphor: "pencil-simple-line",
    lucide: "edit",
    solar: "pen-new-square"
  },
  "exit-edit": {
    phosphor: "pencil-simple-slash",
    lucide: "edit-off",
    solar: "pen-new-square"
  },
  trash: {
    phosphor: "trash",
    lucide: "trash-2",
    solar: "trash-bin-minimalistic"
  },
  copy: {
    phosphor: "clipboard",
    lucide: "copy",
    solar: "copy"
  },
  duplicate: {
    phosphor: "copy",
    lucide: "copy",
    solar: "copy"
  },
  share: {
    phosphor: "share",
    lucide: "share",
    solar: "share"
  },
  archive: {
    phosphor: "archive",
    lucide: "archive",
    solar: "archive"
  },
  star: {
    phosphor: "star",
    lucide: "star",
    solar: "star"
  },
  bookmark: {
    phosphor: "heroicons:bookmark",
    lucide: "bookmark",
    solar: "bookmark"
  },
  heart: {
    phosphor: "heart",
    lucide: "heart",
    solar: "heart"
  },

  // Interface Elements
  search: {
    phosphor: "magnifying-glass",
    lucide: "search",
    solar: "minimalistic-magnifer"
  },
  info: {
    phosphor: "info",
    lucide: "info",
    solar: "info-circle"
  },
  warning: {
    phosphor: "warning",
    lucide: "alert-triangle",
    solar: "danger-triangle"
  },
  question: {
    phosphor: "question",
    lucide: "help-circle",
    solar: "question-circle"
  },

  // Data and Content
  list: {
    phosphor: "list",
    lucide: "list",
    solar: "list"
  },
  "list-bullets": {
    phosphor: "list-bullets",
    lucide: "list",
    solar: "list"
  },
  "list-ordered": {
    phosphor: "list-numbers",
    lucide: "list-ordered",
    solar: "list-1"
  },
  "list-check": {
    phosphor: "list-checks",
    lucide: "list-todo",
    solar: "checklist"
  },
  table: {
    phosphor: "table",
    lucide: "table",
    solar: "table"
  },
  calendar: {
    phosphor: "calendar-dots",
    lucide: "calendar",
    solar: "calendar"
  },
  "calendar-blank": {
    phosphor: "calendar-blank",
    lucide: "calendar",
    solar: "calendar"
  },
  clock: {
    phosphor: "clock",
    lucide: "clock",
    solar: "clock-circle"
  },
  history: {
    phosphor: "clock-counter-clockwise",
    lucide: "clock",
    solar: "clock-circle"
  },

  // Media Controls
  play: {
    phosphor: "play",
    lucide: "play",
    solar: "play"
  },
  "play-circle": {
    phosphor: "play-circle",
    lucide: "play-circle",
    solar: "play-circle"
  },
  pause: {
    phosphor: "pause",
    lucide: "pause",
    solar: "pause"
  },
  stop: {
    phosphor: "stop",
    lucide: "square",
    solar: "stop"
  },

  // Technology
  code: {
    phosphor: "code",
    lucide: "code",
    solar: "code"
  },
  terminal: {
    phosphor: "terminal",
    lucide: "terminal",
    solar: "command"
  },
  database: {
    phosphor: "database",
    lucide: "database",
    solar: "database"
  },

  // Communication
  chat: {
    phosphor: "chat",
    lucide: "message-circle",
    solar: "chat-round"
  },
  chats: {
    phosphor: "chats",
    lucide: "messages-square",
    solar: "chat-round-line"
  },
  "chat-two": {
    phosphor: "chat-teardrop-text",
    lucide: "message-circle",
    solar: "chat-round"
  },
  "chat-three": {
    phosphor: "chat-centered-dots",
    lucide: "message-circle",
    solar: "chat-round"
  },
  support: {
    phosphor: "hand-heart",
    lucide: "heart-handshake",
    solar: "heart-handshake"
  },
  mail: {
    phosphor: "envelope",
    lucide: "mail",
    solar: "letter"
  },
  bell: {
    phosphor: "bell",
    lucide: "bell",
    solar: "bell"
  },

  // Layout and Organization
  folder: {
    phosphor: "folder",
    lucide: "folder",
    solar: "folder"
  },
  grid: {
    phosphor: "squares-four",
    lucide: "grid-3x3",
    solar: "widget-4"
  },
  widget: {
    phosphor: "squares-four",
    lucide: "shapes",
    solar: "widget-4"
  },
  tag: {
    phosphor: "tag",
    lucide: "tag",
    solar: "tag"
  },

  // Status and State
  lock: {
    phosphor: "lock",
    lucide: "lock",
    solar: "lock"
  },
  "lock-open": {
    phosphor: "lock-open",
    lucide: "unlock",
    solar: "lock-unlocked"
  },
  show: {
    phosphor: "eye",
    lucide: "eye",
    solar: "eye"
  },
  hide: {
    phosphor: "eye-slash",
    lucide: "eye-off",
    solar: "eye-closed"
  },

  // Connectivity and Links
  link: {
    phosphor: "link",
    lucide: "link",
    solar: "link"
  },
  unlink: {
    phosphor: "link-break",
    lucide: "unlink",
    solar: "link-broken"
  },
  "link-simple": {
    phosphor: "link-simple",
    lucide: "link-2",
    solar: "link-minimalistic"
  },

  // Tools and Objects
  crop: {
    phosphor: "crop",
    lucide: "crop",
    solar: "crop"
  },

  // Navigation UI
  more: {
    phosphor: "dots-three-vertical",
    lucide: "more-vertical",
    solar: "menu-dots"
  },
  "more-horizontal": {
    phosphor: "dots-three",
    lucide: "more-horizontal",
    solar: "menu-dots-bold"
  },
  "more-outline-horizontal": {
    phosphor: "dots-three-outline",
    lucide: "more-horizontal",
    solar: "menu-dots-bold"
  },
  bars: {
    phosphor: "list",
    lucide: "menu",
    solar: "hamburger-menu"
  },

  // Special/Custom Icons
  target: {
    phosphor: "target",
    lucide: "target",
    solar: "target"
  },
  sparkle: {
    phosphor: "sparkle",
    lucide: "sparkles",
    solar: "star-shine"
  },
  rocket: {
    phosphor: "rocket",
    lucide: "rocket",
    solar: "rocket"
  },
  cube: {
    phosphor: "cube",
    lucide: "cube",
    solar: "cube"
  },

  // User and People
  user: {
    phosphor: "user",
    lucide: "user",
    solar: "user"
  },
  users: {
    phosphor: "users",
    lucide: "users",
    solar: "users-group-rounded"
  },

  // Device and Hardware
  camera: {
    phosphor: "camera",
    lucide: "camera",
    solar: "camera"
  },
  microphone: {
    phosphor: "microphone",
    lucide: "mic",
    solar: "microphone"
  },
  keyboard: {
    phosphor: "keyboard",
    lucide: "keyboard",
    solar: "keyboard"
  },

  // Charts and Analytics
  chart: {
    phosphor: "chart-pie",
    lucide: "pie-chart",
    solar: "chart"
  },
  "chart-bar": {
    phosphor: "chart-bar",
    lucide: "bar-chart",
    solar: "chart-2"
  },
  "chart-line": {
    phosphor: "chart-line",
    lucide: "line-chart",
    solar: "chart"
  },

  // Movement and Transfer
  upload: {
    phosphor: "upload",
    lucide: "upload",
    solar: "upload"
  },
  download: {
    phosphor: "download-simple",
    lucide: "download",
    solar: "download"
  },

  // Text and Typography
  "text-h1": {
    phosphor: "text-h-one",
    lucide: "heading-1",
    solar: "text"
  },
  "text-h2": {
    phosphor: "text-h-two",
    lucide: "heading-2",
    solar: "text"
  },
  "text-h3": {
    phosphor: "text-h-three",
    lucide: "heading-3",
    solar: "text"
  },
  paragraph: {
    phosphor: "paragraph",
    lucide: "type",
    solar: "text"
  },
  quote: {
    phosphor: "quotes",
    lucide: "quote",
    solar: "quote"
  },

  // Social and Branding
  twitter: {
    phosphor: "x-logo",
    lucide: "twitter",
    solar: "twitter"
  },
  youtube: {
    phosphor: "youtube-logo",
    lucide: "youtube",
    solar: "video-frame-play-horizontal"
  },

  // Custom Compound Actions
  "check-circle": {
    phosphor: "check-circle",
    lucide: "check-circle",
    solar: "check-circle"
  },
  "plus-circle": {
    phosphor: "plus-circle",
    lucide: "plus-circle",
    solar: "add-circle"
  },
  "minus-circle": {
    phosphor: "minus-circle",
    lucide: "minus-circle",
    solar: "close-circle"
  },
  "x-circle": {
    phosphor: "x-circle",
    lucide: "x-circle",
    solar: "close-circle"
  },

  // Resource-specific icons used in resource.utils.ts
  "check-square": {
    phosphor: "check-square",
    lucide: "check-square",
    solar: "checkbox"
  },
  "check-square-offset": {
    phosphor: "check-square-offset",
    lucide: "check-square",
    solar: "checkbox"
  },
  "bounding-box": {
    phosphor: "bounding-box",
    lucide: "box",
    solar: "widget"
  },
  "caret-circle-up": {
    phosphor: "caret-circle-up",
    lucide: "chevron-up-circle",
    solar: "arrow-up"
  },
  bicycle: {
    phosphor: "bicycle",
    lucide: "bike",
    solar: "bicycle"
  },
  rss: {
    phosphor: "rss",
    lucide: "rss",
    solar: "rss"
  },
  globe: {
    phosphor: "globe",
    lucide: "globe",
    solar: "globe"
  },
  bank: {
    phosphor: "bank",
    lucide: "building",
    solar: "bank"
  },
  "arrows-left-right": {
    phosphor: "arrows-left-right",
    lucide: "arrow-left-right",
    solar: "arrow-left-right"
  },
  "map-pin": {
    phosphor: "map-pin",
    lucide: "map-pin",
    solar: "map-point"
  },
  "rows-plus-bottom": {
    phosphor: "rows-plus-bottom",
    lucide: "rows-plus-bottom",
    solar: "rows-plus-bottom"
  },

  // Additional icons found in Icon.svelte
  bookmarks: {
    phosphor: "bookmarks",
    lucide: "bookmarks",
    solar: "bookmark-opened"
  },
  pin: {
    phosphor: "push-pin-simple",
    lucide: "pin",
    solar: "pin"
  },
  unpin: {
    phosphor: "push-pin-simple-slash",
    lucide: "pin-off",
    solar: "pin"
  },
  "arrow-elbow-down-left": {
    phosphor: "arrow-elbow-down-left",
    lucide: "corner-down-left",
    solar: "arrow-left-down"
  },
  "arrow-elbow-right-up": {
    phosphor: "arrow-elbow-right-up",
    lucide: "corner-up-right",
    solar: "arrow-right-up"
  },
  "insert-down": {
    phosphor: "arrow-elbow-down-right",
    lucide: "corner-down-right",
    solar: "arrow-right-down"
  },
  "magnifying-glass-plus": {
    phosphor: "magnifying-glass-plus",
    lucide: "zoom-in",
    solar: "magnifer-zoom-in"
  },
  "magnifying-glass-minus": {
    phosphor: "magnifying-glass-minus",
    lucide: "zoom-out",
    solar: "magnifer-zoom-out"
  },
  underline: {
    phosphor: "text-underline",
    lucide: "underline",
    solar: "text-underline"
  },
  strikethrough: {
    phosphor: "text-strikethrough",
    lucide: "strikethrough",
    solar: "text-cross"
  },
  highlight: {
    phosphor: "highlighter",
    lucide: "highlighter",
    solar: "pen"
  },
  highlighter: {
    phosphor: "highlighter",
    lucide: "highlighter",
    solar: "pen"
  },
  "highlighter-circle": {
    phosphor: "highlighter-circle",
    lucide: "highlighter",
    solar: "pen"
  },
  "cursor-arrow-rays": {
    phosphor: "cursor-click",
    lucide: "mouse-pointer-click",
    solar: "cursor-square"
  },
  "link-arrow-down": {
    phosphor: "arrow-square-down",
    lucide: "corner-down-left",
    solar: "link-round"
  },
  "arrow-path": {
    phosphor: "arrow-clockwise",
    lucide: "refresh-cw",
    solar: "restart"
  },
  reload: {
    phosphor: "arrow-counter-clockwise",
    lucide: "refresh-cw",
    solar: "restart"
  },
  sync: {
    phosphor: "arrows-clockwise",
    lucide: "refresh-cw",
    solar: "restart"
  },
  refresh: {
    phosphor: "arrow-clockwise",
    lucide: "refresh-cw",
    solar: "refresh"
  },
  convert: {
    phosphor: "arrows-clockwise",
    lucide: "rotate-ccw",
    solar: "reset"
  },
  reset: {
    phosphor: "arrows-clockwise",
    lucide: "rotate-ccw",
    solar: "reset"
  },
  "book-open": {
    phosphor: "book-open",
    lucide: "book-open",
    solar: "book-2"
  },
  focus: {
    phosphor: "crosshair",
    lucide: "focus",
    solar: "target"
  },
  "brackets-square": {
    phosphor: "brackets-square",
    lucide: "parentheses",
    solar: "folder"
  },

  // Resource-specific icons
  collection: {
    phosphor: "brackets-round",
    lucide: "parentheses",
    solar: "folder"
  },
  relation: {
    phosphor: "link-simple-horizontal",
    lucide: "link-2",
    solar: "link-minimalistic"
  },
  combination: {
    phosphor: "bounding-box",
    lucide: "box",
    solar: "widget"
  },

  sliders: {
    phosphor: "sliders",
    lucide: "sliders",
    solar: "settings"
  },
  "sliders-horizontal": {
    phosphor: "sliders-horizontal",
    lucide: "sliders-horizontal",
    solar: "settings"
  },
  faders: {
    phosphor: "faders",
    lucide: "sliders",
    solar: "faders"
  },
  "faders-horizontal": {
    phosphor: "faders-horizontal",
    lucide: "sliders-horizontal",
    solar: "faders"
  },
  "picture-in-picture": {
    phosphor: "picture-in-picture",
    lucide: "picture-in-picture",
    solar: "pip"
  },
  "device-mobile": {
    phosphor: "device-mobile",
    lucide: "smartphone",
    solar: "phone"
  },
  "device-tablet": {
    phosphor: "device-tablet",
    lucide: "tablet",
    solar: "tablet"
  },
  desktop: {
    phosphor: "desktop",
    lucide: "monitor",
    solar: "monitor"
  },
  aperture: {
    phosphor: "aperture",
    lucide: "aperture",
    solar: "camera"
  },
  at: {
    phosphor: "at",
    lucide: "at-sign",
    solar: "mention"
  },
  lightbulb: {
    phosphor: "lightbulb",
    lucide: "lightbulb",
    solar: "lightbulb"
  },
  fullscreen: {
    phosphor: "arrows-out",
    lucide: "maximize",
    solar: "maximize"
  },
  exitfullscreen: {
    phosphor: "arrows-in",
    lucide: "minimize",
    solar: "minimize"
  },
  pop: {
    phosphor: "arrow-line-up-right",
    lucide: "maximize",
    solar: "maximize"
  },
  expand: {
    phosphor: "arrows-out-simple",
    lucide: "maximize-2",
    solar: "maximize"
  },
  widen: {
    phosphor: "arrows-out-line-horizontal",
    lucide: "maximize-2",
    solar: "maximize"
  },
  shrink: {
    phosphor: "arrows-in-line-horizontal",
    lucide: "minimize",
    solar: "minimize"
  },
  "widen-vertical": {
    phosphor: "arrows-out-line-vertical",
    lucide: "maximize-2",
    solar: "maximize"
  },
  "shrink-vertical": {
    phosphor: "arrows-in-line-vertical",
    lucide: "minimize",
    solar: "minimize"
  },
  graph: {
    phosphor: "graph",
    lucide: "activity",
    solar: "graph"
  },
  "tree-view": {
    phosphor: "tree-view",
    lucide: "git-branch",
    solar: "hierarchy"
  },
  traverse: {
    phosphor: "flow-arrow",
    lucide: "arrow-right",
    solar: "arrow-right"
  },
  "text-align-left": {
    phosphor: "text-align-left",
    lucide: "align-left",
    solar: "text-align-left"
  },
  shapes: {
    phosphor: "shapes",
    lucide: "shapes",
    solar: "widget-2"
  },
  hash: {
    phosphor: "hash",
    lucide: "hash",
    solar: "hashtag"
  },
  formula: {
    phosphor: "math-operations",
    lucide: "calculator",
    solar: "calculator-minimalistic"
  },
  "magic-wand": {
    phosphor: "magic-wand",
    lucide: "wand",
    solar: "magic-stick"
  },
  palette: {
    phosphor: "palette",
    lucide: "palette",
    solar: "palette"
  },
  timer: {
    phosphor: "timer",
    lucide: "timer",
    solar: "stopwatch"
  },
  "git-branch": {
    phosphor: "git-branch",
    lucide: "git-branch",
    solar: "branch"
  },
  "cloud-sun": {
    phosphor: "cloud-sun",
    lucide: "cloud-sun",
    solar: "weather"
  },
  smiley: {
    phosphor: "smiley",
    lucide: "smile",
    solar: "emoticon"
  },
  "thumbs-up": {
    phosphor: "thumbs-up",
    lucide: "thumbs-up",
    solar: "like"
  },
  "text-h4": {
    phosphor: "text-h-four",
    lucide: "heading-4",
    solar: "text"
  },
  "code-block": {
    phosphor: "code-block",
    lucide: "code",
    solar: "code"
  },
  sigma: {
    phosphor: "sigma",
    lucide: "sigma",
    solar: "sigma"
  },
  tabs: {
    phosphor: "tabs",
    lucide: "tabs",
    solar: "widget"
  },
  stack: {
    phosphor: "stack",
    lucide: "layers",
    solar: "layers"
  },
  "music-note": {
    phosphor: "music-note",
    lucide: "music",
    solar: "music-note"
  },
  bird: {
    phosphor: "bird",
    lucide: "bird",
    solar: "bird"
  },
  "amazon-logo": {
    phosphor: "amazon-logo",
    lucide: "package",
    solar: "bag-4"
  },
  markdown: {
    phosphor: "markdown-logo",
    lucide: "file-text",
    solar: "document-text"
  },
  "magnifying-glass": {
    phosphor: "magnifying-glass",
    lucide: "search",
    solar: "minimalistic-magnifer"
  },
  infinity: {
    phosphor: "infinity",
    lucide: "infinity",
    solar: "infinity"
  },
  hourglass: {
    phosphor: "hourglass-simple",
    lucide: "hourglass",
    solar: "hourglass"
  },
  alarm: {
    phosphor: "alarm",
    lucide: "alarm-clock",
    solar: "alarm"
  },
  asterisk: {
    phosphor: "asterisk",
    lucide: "asterisk",
    solar: "star"
  },
  "circle-dashed": {
    phosphor: "circle-dashed",
    lucide: "circle-dashed",
    solar: "circle"
  },

  "to-sub": {
    phosphor: "arrow-bend-down-right",
    lucide: "corner-down-right",
    solar: "arrow-right-down"
  },
  move: {
    phosphor: "arrow-bend-up-right",
    lucide: "corner-up-right",
    solar: "arrow-right-up"
  },
  back: {
    phosphor: "arrow-u-up-left",
    lucide: "corner-down-left",
    solar: "arrow-left-down"
  },
  "back-sm": {
    phosphor: "arrow-left",
    lucide: "arrow-left",
    solar: "arrow-left"
  },
  "level-up": {
    phosphor: "arrow-fat-lines-up",
    lucide: "chevrons-up",
    solar: "double-alt-arrow-up"
  },
  "star-fill": {
    phosphor: "star-fill",
    lucide: "star",
    solar: "star-bold"
  },
  "circle-fill": {
    phosphor: "circle-fill",
    lucide: "circle",
    solar: "circle-bold"
  },
  "split-screen": {
    phosphor: "square-split-horizontal",
    lucide: "columns",
    solar: "widget"
  },

  // Additional missing icons
  text: {
    phosphor: "text",
    lucide: "type",
    solar: "text"
  },
  "caret-circle-down": {
    phosphor: "caret-circle-down",
    lucide: "chevron-down-circle",
    solar: "arrow-down"
  },
  "currency-dollar": {
    phosphor: "currency-dollar",
    lucide: "dollar-sign",
    solar: "dollar"
  },
  translate: {
    phosphor: "translate",
    lucide: "languages",
    solar: "translation"
  },
  money: {
    phosphor: "money",
    lucide: "banknote",
    solar: "banknote"
  },
  map: {
    phosphor: "map-trifold",
    lucide: "map",
    solar: "map"
  },
  "cursor-click": {
    phosphor: "cursor-click",
    lucide: "mouse-pointer-click",
    solar: "cursor-square"
  },
  note: {
    phosphor: "note",
    lucide: "sticky-note",
    solar: "notes"
  },
  "note-blank": {
    phosphor: "note-blank",
    lucide: "sticky-note",
    solar: "notes"
  },
  "log-out": {
    phosphor: "sign-out",
    lucide: "log-out",
    solar: "logout"
  },
  "log-in": {
    phosphor: "sign-in",
    lucide: "log-in",
    solar: "login"
  },
  undo: {
    phosphor: "arrow-u-up-left",
    lucide: "corner-up-left",
    solar: "arrow-left-up"
  },
  randomize: {
    phosphor: "dice-three",
    lucide: "dice-3",
    solar: "dice"
  },
  "paint-brush": {
    phosphor: "paint-brush",
    lucide: "paintbrush",
    solar: "palette"
  },
  save: {
    phosphor: "floppy-disk",
    lucide: "save",
    solar: "diskette"
  },
  redo: {
    phosphor: "arrow-u-up-right",
    lucide: "corner-up-right",
    solar: "arrow-right-up"
  },
  restore: {
    phosphor: "arrow-u-down-right",
    lucide: "corner-down-right",
    solar: "arrow-right-down"
  },
  rearrange: {
    phosphor: "dots-six-vertical",
    lucide: "grip-vertical",
    solar: "menu-dots"
  },
  "rearrange-horizontal": {
    phosphor: "dots-six",
    lucide: "grip-horizontal",
    solar: "menu-dots"
  },
  grab: {
    phosphor: "arrows-out-cardinal",
    lucide: "grip-vertical",
    solar: "menu-dots"
  },
  sidebar: {
    phosphor: "sidebar",
    lucide: "panel-left",
    solar: "sidebar-minimalistic"
  },
  canvas: {
    phosphor: "chalkboard-simple",
    lucide: "presentation",
    solar: "presentation-graph"
  },
  clipboard: {
    phosphor: "clipboard",
    lucide: "clipboard",
    solar: "clipboard"
  },
  command: {
    phosphor: "command",
    lucide: "command",
    solar: "command"
  },
  cpu: {
    phosphor: "cpu",
    lucide: "cpu",
    solar: "cpu"
  },
  "chart-line-up": {
    phosphor: "chart-line-up",
    lucide: "trending-up",
    solar: "chart"
  },
  "person-simple": {
    phosphor: "person-simple",
    lucide: "user",
    solar: "user"
  },
  gear: {
    phosphor: "gear-fine",
    lucide: "settings",
    solar: "settings"
  },
  "video-camera": {
    phosphor: "video-camera",
    lucide: "video",
    solar: "videocamera"
  },
  "video-conference": {
    phosphor: "video-conference",
    lucide: "video",
    solar: "videocamera"
  },
  discord: {
    phosphor: "discord-logo",
    lucide: "gamepad-2",
    solar: "gamepad"
  },
  reddit: {
    phosphor: "reddit-logo",
    lucide: "circle",
    solar: "reddit"
  },
  instagram: {
    phosphor: "instagram-logo",
    lucide: "instagram",
    solar: "instagram"
  },
  butterfly: {
    phosphor: "butterfly",
    lucide: "butterfly",
    solar: "butterfly"
  },
  flag: {
    phosphor: "flag",
    lucide: "flag",
    solar: "flag"
  },
  wallet: {
    phosphor: "wallet",
    lucide: "wallet",
    solar: "wallet"
  },
  "github-logo": {
    phosphor: "github-logo",
    lucide: "github",
    solar: "github"
  },
  book: {
    phosphor: "book",
    lucide: "book",
    solar: "book"
  },
  "terminal-window": {
    phosphor: "terminal-window",
    lucide: "terminal",
    solar: "programming"
  },
  offline: {
    phosphor: "cloud-slash",
    lucide: "cloud-off",
    solar: "cloud-cross"
  },
  backspace: {
    phosphor: "backspace",
    lucide: "backspace",
    solar: "backspace"
  },
  scan: {
    phosphor: "scan",
    lucide: "scan",
    solar: "scanner"
  },
  pip: {
    phosphor: "picture-in-picture",
    lucide: "picture-in-picture",
    solar: "pip"
  }
};

export type IconSet = "phosphor" | "lucide" | "solar";
