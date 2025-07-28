export interface IconMapping {
  phosphor: string;
  lucide: string;
  solar?: string;
}

export const iconMappings: Record<string, IconMapping> = {
  // Navigation and Actions
  home: {
    phosphor: "house-light",
    lucide: "home",
    solar: "home-linear"
  },
  bolt: {
    phosphor: "lightning-light",
    lucide: "zap",
    solar: "bolt-linear"
  },
  settings: {
    phosphor: "gear-light",
    lucide: "settings",
    solar: "settings-linear"
  },
  plus: {
    phosphor: "plus-light",
    lucide: "plus",
    solar: "add-linear"
  },
  minus: {
    phosphor: "minus-light",
    lucide: "minus",
    solar: "minus-linear"
  },
  cross: {
    phosphor: "x-light",
    lucide: "x",
    solar: "close-linear"
  },
  check: {
    phosphor: "check-light",
    lucide: "check",
    solar: "check-linear"
  },

  // Arrows
  "arrow-left": {
    phosphor: "arrow-left-light",
    lucide: "arrow-left",
    solar: "arrow-left-linear"
  },
  "arrow-right": {
    phosphor: "arrow-right-light",
    lucide: "arrow-right",
    solar: "arrow-right-linear"
  },
  "arrow-up": {
    phosphor: "arrow-up-light",
    lucide: "arrow-up",
    solar: "arrow-up-linear"
  },
  "arrow-down": {
    phosphor: "arrow-down-light",
    lucide: "arrow-down",
    solar: "arrow-down-linear"
  },
  "arrow-up-right": {
    phosphor: "arrow-up-right-light",
    lucide: "arrow-up-right",
    solar: "arrow-up-right-linear"
  },

  // Chevrons
  "chevron-left": {
    phosphor: "caret-left-light",
    lucide: "chevron-left",
    solar: "alt-arrow-left-linear"
  },
  "chevron-right": {
    phosphor: "caret-right-light",
    lucide: "chevron-right",
    solar: "alt-arrow-right-linear"
  },
  "chevron-up": {
    phosphor: "caret-up-light",
    lucide: "chevron-up",
    solar: "alt-arrow-up-linear"
  },
  "chevron-down": {
    phosphor: "caret-down-light",
    lucide: "chevron-down",
    solar: "alt-arrow-down-linear"
  },

  // Core Shapes and Elements
  circle: {
    phosphor: "circle-light",
    lucide: "circle",
    solar: "circle-linear"
  },
  hexagon: {
    phosphor: "hexagon-light",
    lucide: "hexagon",
    solar: "hexagon-linear"
  },
  square: {
    phosphor: "square-light",
    lucide: "square",
    solar: "square-linear"
  },

  // Content and Media
  image: {
    phosphor: "image-light",
    lucide: "image",
    solar: "gallery-linear"
  },
  video: {
    phosphor: "video-light",
    lucide: "video",
    solar: "video-library-linear"
  },
  music: {
    phosphor: "music-note-light",
    lucide: "music",
    solar: "music-note-linear"
  },
  file: {
    phosphor: "file-light",
    lucide: "file",
    solar: "file-linear"
  },
  "file-pdf": {
    phosphor: "file-pdf-light",
    lucide: "file-text",
    solar: "file-text-linear"
  },

  // Actions
  edit: {
    phosphor: "pencil-simple-light",
    lucide: "edit",
    solar: "pen-new-square-linear"
  },
  trash: {
    phosphor: "trash-light",
    lucide: "trash-2",
    solar: "trash-bin-minimalistic-linear"
  },
  copy: {
    phosphor: "copy-light",
    lucide: "copy",
    solar: "copy-linear"
  },
  share: {
    phosphor: "share-light",
    lucide: "share",
    solar: "share-linear"
  },
  archive: {
    phosphor: "archive-light",
    lucide: "archive",
    solar: "archive-linear"
  },
  star: {
    phosphor: "star-light",
    lucide: "star",
    solar: "star-linear"
  },
  bookmark: {
    phosphor: "bookmark-simple-light",
    lucide: "bookmark",
    solar: "bookmark-linear"
  },

  // Interface Elements
  search: {
    phosphor: "magnifying-glass-light",
    lucide: "search",
    solar: "minimalistic-magnifer-linear"
  },
  info: {
    phosphor: "info-light",
    lucide: "info",
    solar: "info-circle-linear"
  },
  warning: {
    phosphor: "warning-light",
    lucide: "alert-triangle",
    solar: "danger-triangle-linear"
  },
  question: {
    phosphor: "question-light",
    lucide: "help-circle",
    solar: "question-circle-linear"
  },

  // Data and Content
  list: {
    phosphor: "list-bullets-light",
    lucide: "list",
    solar: "list-linear"
  },
  "list-ordered": {
    phosphor: "list-numbers-light",
    lucide: "list-ordered",
    solar: "list-1-linear"
  },
  "list-check": {
    phosphor: "list-checks-light",
    lucide: "list-todo",
    solar: "checklist-linear"
  },
  table: {
    phosphor: "table-light",
    lucide: "table",
    solar: "table-linear"
  },
  calendar: {
    phosphor: "calendar-light",
    lucide: "calendar",
    solar: "calendar-linear"
  },
  clock: {
    phosphor: "clock-light",
    lucide: "clock",
    solar: "clock-circle-linear"
  },

  // Media Controls
  play: {
    phosphor: "play-light",
    lucide: "play",
    solar: "play-linear"
  },
  pause: {
    phosphor: "pause-light",
    lucide: "pause",
    solar: "pause-linear"
  },
  stop: {
    phosphor: "stop-light",
    lucide: "square",
    solar: "stop-linear"
  },

  // Technology
  code: {
    phosphor: "code-light",
    lucide: "code",
    solar: "code-linear"
  },
  terminal: {
    phosphor: "terminal-light",
    lucide: "terminal",
    solar: "terminal-linear"
  },
  database: {
    phosphor: "database-light",
    lucide: "database",
    solar: "database-linear"
  },

  // Communication
  chat: {
    phosphor: "chat-light",
    lucide: "message-circle",
    solar: "chat-round-linear"
  },
  mail: {
    phosphor: "envelope-light",
    lucide: "mail",
    solar: "letter-linear"
  },
  bell: {
    phosphor: "bell-light",
    lucide: "bell",
    solar: "bell-linear"
  },

  // Layout and Organization
  folder: {
    phosphor: "folder-light",
    lucide: "folder",
    solar: "folder-linear"
  },
  grid: {
    phosphor: "squares-four-light",
    lucide: "grid-3x3",
    solar: "widget-4-linear"
  },
  tag: {
    phosphor: "tag-light",
    lucide: "tag",
    solar: "tag-linear"
  },

  // Status and State
  lock: {
    phosphor: "lock-light",
    lucide: "lock",
    solar: "lock-linear"
  },
  "lock-open": {
    phosphor: "lock-open-light",
    lucide: "unlock",
    solar: "lock-unlocked-linear"
  },
  eye: {
    phosphor: "eye-light",
    lucide: "eye",
    solar: "eye-linear"
  },
  "eye-slash": {
    phosphor: "eye-slash-light",
    lucide: "eye-off",
    solar: "eye-closed-linear"
  },

  // Connectivity and Links
  link: {
    phosphor: "link-light",
    lucide: "link",
    solar: "link-linear"
  },
  "link-break": {
    phosphor: "link-break-light",
    lucide: "unlink",
    solar: "link-broken-linear"
  },
  "link-simple": {
    phosphor: "link-simple-light",
    lucide: "link-2",
    solar: "link-minimalistic-linear"
  },

  // Tools and Objects
  crop: {
    phosphor: "crop-light",
    lucide: "crop",
    solar: "crop-linear"
  },
  highlighter: {
    phosphor: "highlighter-light",
    lucide: "highlighter",
    solar: "pen-linear"
  },

  // Navigation UI
  "dots-vertical": {
    phosphor: "dots-three-vertical-light",
    lucide: "more-vertical",
    solar: "menu-dots-linear"
  },
  "dots-horizontal": {
    phosphor: "dots-three-light",
    lucide: "more-horizontal",
    solar: "menu-dots-bold"
  },
  bars: {
    phosphor: "list-light",
    lucide: "menu",
    solar: "hamburger-menu-linear"
  },

  // Special/Custom Icons
  target: {
    phosphor: "target-light",
    lucide: "target",
    solar: "target-linear"
  },
  sparkle: {
    phosphor: "sparkle-light",
    lucide: "sparkles",
    solar: "star-shine-linear"
  },
  rocket: {
    phosphor: "rocket-light",
    lucide: "rocket",
    solar: "rocket-linear"
  },

  // User and People
  user: {
    phosphor: "user-light",
    lucide: "user",
    solar: "user-linear"
  },
  users: {
    phosphor: "users-light",
    lucide: "users",
    solar: "users-group-rounded-linear"
  },

  // Device and Hardware
  camera: {
    phosphor: "camera-light",
    lucide: "camera",
    solar: "camera-linear"
  },
  microphone: {
    phosphor: "microphone-light",
    lucide: "mic",
    solar: "microphone-linear"
  },
  keyboard: {
    phosphor: "keyboard-light",
    lucide: "keyboard",
    solar: "keyboard-linear"
  },

  // Charts and Analytics
  chart: {
    phosphor: "chart-pie-light",
    lucide: "pie-chart",
    solar: "chart-linear"
  },
  "chart-bar": {
    phosphor: "chart-bar-light",
    lucide: "bar-chart",
    solar: "chart-2-linear"
  },
  "chart-line": {
    phosphor: "chart-line-light",
    lucide: "line-chart",
    solar: "chart-linear"
  },

  // Movement and Transfer
  upload: {
    phosphor: "upload-light",
    lucide: "upload",
    solar: "upload-linear"
  },
  download: {
    phosphor: "download-light",
    lucide: "download",
    solar: "download-linear"
  },

  // Text and Typography
  "text-h1": {
    phosphor: "text-h-one-light",
    lucide: "heading-1",
    solar: "text-linear"
  },
  "text-h2": {
    phosphor: "text-h-two-light",
    lucide: "heading-2",
    solar: "text-linear"
  },
  "text-h3": {
    phosphor: "text-h-three-light",
    lucide: "heading-3",
    solar: "text-linear"
  },
  paragraph: {
    phosphor: "paragraph-light",
    lucide: "type",
    solar: "text-linear"
  },
  quote: {
    phosphor: "quotes-light",
    lucide: "quote",
    solar: "quote-linear"
  },

  // Social and Branding
  "x-logo": {
    phosphor: "x-logo-light",
    lucide: "twitter",
    solar: "twitter-linear"
  },
  "youtube-logo": {
    phosphor: "youtube-logo-light",
    lucide: "youtube",
    solar: "video-frame-play-horizontal-linear"
  },

  // Custom Compound Actions
  "check-circle": {
    phosphor: "check-circle-light",
    lucide: "check-circle",
    solar: "check-circle-linear"
  },
  "plus-circle": {
    phosphor: "plus-circle-light",
    lucide: "plus-circle",
    solar: "add-circle-linear"
  },
  "minus-circle": {
    phosphor: "minus-circle-light",
    lucide: "minus-circle",
    solar: "close-circle-linear"
  },
  "x-circle": {
    phosphor: "x-circle-light",
    lucide: "x-circle",
    solar: "close-circle-linear"
  },

  // Resource-specific icons used in resource.utils.ts
  "check-square": {
    phosphor: "check-square-light",
    lucide: "check-square",
    solar: "checkbox-linear"
  },
  "check-square-offset": {
    phosphor: "check-square-offset-light",
    lucide: "check-square",
    solar: "checkbox-linear"
  },
  "bounding-box": {
    phosphor: "bounding-box-light",
    lucide: "box",
    solar: "widget-linear"
  },
  "caret-circle-up": {
    phosphor: "caret-circle-up-light",
    lucide: "chevron-up-circle",
    solar: "arrow-up-linear"
  },
  bicycle: {
    phosphor: "bicycle-light",
    lucide: "bike",
    solar: "bicycle-linear"
  },
  rss: {
    phosphor: "rss-light",
    lucide: "rss",
    solar: "rss-linear"
  },
  globe: {
    phosphor: "globe-light",
    lucide: "globe",
    solar: "globe-linear"
  },
  bank: {
    phosphor: "bank-light",
    lucide: "building",
    solar: "bank-linear"
  },
  "arrows-left-right": {
    phosphor: "arrows-left-right-light",
    lucide: "arrow-left-right",
    solar: "arrow-left-right-linear"
  },
  "map-pin": {
    phosphor: "map-pin-light",
    lucide: "map-pin",
    solar: "map-point-linear"
  },
  "arrow-down-left": {
    phosphor: "arrow-down-left-light",
    lucide: "arrow-down-left",
    solar: "arrow-down-left-linear"
  },

  // Additional icons found in Icon.svelte
  bookmarks: {
    phosphor: "bookmarks-light",
    lucide: "bookmarks",
    solar: "bookmark-opened-linear"
  },
  "arrow-elbow-down-left": {
    phosphor: "arrow-elbow-down-left-light",
    lucide: "corner-down-left",
    solar: "arrow-left-down-linear"
  },
  "arrow-elbow-right-up": {
    phosphor: "arrow-elbow-right-up-light",
    lucide: "corner-up-right",
    solar: "arrow-right-up-linear"
  },
  "magnifying-glass-plus": {
    phosphor: "magnifying-glass-plus-light",
    lucide: "zoom-in",
    solar: "magnifer-zoom-in-linear"
  },
  "magnifying-glass-minus": {
    phosphor: "magnifying-glass-minus-light",
    lucide: "zoom-out",
    solar: "magnifer-zoom-out-linear"
  },
  underline: {
    phosphor: "text-underline-light",
    lucide: "underline",
    solar: "text-underline-linear"
  },
  strikethrough: {
    phosphor: "text-strikethrough-light",
    lucide: "strikethrough",
    solar: "text-cross-linear"
  },
  highlight: {
    phosphor: "highlighter-light",
    lucide: "highlighter",
    solar: "pen-linear"
  },
  "cursor-arrow-rays": {
    phosphor: "cursor-click-light",
    lucide: "mouse-pointer-click",
    solar: "cursor-square-linear"
  },
  "link-arrow-left": {
    phosphor: "arrow-square-out-light",
    lucide: "external-link",
    solar: "link-round-angle-linear"
  },
  "link-arrow-down": {
    phosphor: "arrow-square-down-light",
    lucide: "corner-down-left",
    solar: "link-round-linear"
  },

  // More missing icons
  "arrow-path": {
    phosphor: "arrow-clockwise-light",
    lucide: "refresh-cw",
    solar: "restart-linear"
  },
  sync: {
    phosphor: "arrow-clockwise-light",
    lucide: "refresh-cw",
    solar: "restart-linear"
  },
  "book-open": {
    phosphor: "book-open-light",
    lucide: "book-open",
    solar: "book-2-linear"
  },
  focus: {
    phosphor: "crosshair-light",
    lucide: "focus",
    solar: "target-linear"
  },
  clipboard: {
    phosphor: "clipboard-light",
    lucide: "clipboard",
    solar: "clipboard-linear"
  },

  // Resource-specific icons
  collection: {
    phosphor: "brackets-round-light",
    lucide: "folder",
    solar: "folder-linear"
  },
  relation: {
    phosphor: "link-simple-horizontal-light",
    lucide: "link-2",
    solar: "link-minimalistic-linear"
  },
  combination: {
    phosphor: "bounding-box-light",
    lucide: "box",
    solar: "widget-linear"
  },

  // Common icons found in codebase
  sliders: {
    phosphor: "sliders-horizontal-light",
    lucide: "sliders-horizontal",
    solar: "settings-linear"
  },
  "picture-in-picture": {
    phosphor: "picture-in-picture-light",
    lucide: "picture-in-picture",
    solar: "pip-linear"
  },
  "device-mobile": {
    phosphor: "device-mobile-light",
    lucide: "smartphone",
    solar: "phone-linear"
  },
  "device-tablet": {
    phosphor: "device-tablet-light",
    lucide: "tablet",
    solar: "tablet-linear"
  },
  desktop: {
    phosphor: "desktop-light",
    lucide: "monitor",
    solar: "monitor-linear"
  },
  aperture: {
    phosphor: "aperture-light",
    lucide: "aperture",
    solar: "camera-linear"
  },
  at: {
    phosphor: "at-light",
    lucide: "at-sign",
    solar: "mention-linear"
  },
  lightbulb: {
    phosphor: "lightbulb-light",
    lucide: "lightbulb",
    solar: "lightbulb-linear"
  },
  "arrows-out": {
    phosphor: "arrows-out-light",
    lucide: "maximize",
    solar: "maximize-linear"
  },
  graph: {
    phosphor: "graph-light",
    lucide: "activity",
    solar: "graph-linear"
  },
  "tree-view": {
    phosphor: "tree-view-light",
    lucide: "git-branch",
    solar: "hierarchy-linear"
  },
  "flow-arrow": {
    phosphor: "flow-arrow-light",
    lucide: "arrow-right",
    solar: "arrow-right-linear"
  },
  "text-align-left": {
    phosphor: "text-align-left-light",
    lucide: "align-left",
    solar: "text-align-left-linear"
  },
  shapes: {
    phosphor: "shapes-light",
    lucide: "shapes",
    solar: "widget-linear"
  },
  hash: {
    phosphor: "hash-light",
    lucide: "hash",
    solar: "hashtag-linear"
  },
  "math-operations": {
    phosphor: "math-operations-light",
    lucide: "calculator",
    solar: "calculator-linear"
  },
  "magic-wand": {
    phosphor: "magic-wand-light",
    lucide: "wand",
    solar: "magic-stick-linear"
  },
  palette: {
    phosphor: "palette-light",
    lucide: "palette",
    solar: "palette-linear"
  },
  timer: {
    phosphor: "timer-light",
    lucide: "timer",
    solar: "stopwatch-linear"
  },
  "git-branch": {
    phosphor: "git-branch-light",
    lucide: "git-branch",
    solar: "branch-linear"
  },
  "cloud-sun": {
    phosphor: "cloud-sun-light",
    lucide: "cloud-sun",
    solar: "weather-linear"
  },
  smiley: {
    phosphor: "smiley-light",
    lucide: "smile",
    solar: "emoticon-linear"
  },
  "thumbs-up": {
    phosphor: "thumbs-up-light",
    lucide: "thumbs-up",
    solar: "like-linear"
  },
  "text-h4": {
    phosphor: "text-h-four-light",
    lucide: "heading-4",
    solar: "text-linear"
  },
  "code-block": {
    phosphor: "code-block-light",
    lucide: "code",
    solar: "code-linear"
  },
  sigma: {
    phosphor: "sigma-light",
    lucide: "sigma",
    solar: "sigma-linear"
  },
  tabs: {
    phosphor: "tabs-light",
    lucide: "tabs",
    solar: "widget-linear"
  },
  stack: {
    phosphor: "stack-light",
    lucide: "layers",
    solar: "layers-linear"
  },
  "music-note": {
    phosphor: "music-note-light",
    lucide: "music",
    solar: "music-note-linear"
  },
  "highlighter-circle": {
    phosphor: "highlighter-circle-light",
    lucide: "highlighter",
    solar: "pen-linear"
  },
  bird: {
    phosphor: "bird-light",
    lucide: "bird",
    solar: "bird-linear"
  },
  "amazon-logo": {
    phosphor: "amazon-logo-light",
    lucide: "package",
    solar: "bag-4-linear"
  },
  "chat-teardrop-text": {
    phosphor: "chat-teardrop-text-light",
    lucide: "message-circle",
    solar: "chat-round-linear"
  },
  "markdown-logo": {
    phosphor: "markdown-logo-light",
    lucide: "file-text",
    solar: "document-text-linear"
  },
  "magnifying-glass": {
    phosphor: "magnifying-glass-light",
    lucide: "search",
    solar: "minimalistic-magnifer-linear"
  },
  infinity: {
    phosphor: "infinity-light",
    lucide: "infinity",
    solar: "infinity-linear"
  },
  "hourglass-simple": {
    phosphor: "hourglass-simple-light",
    lucide: "hourglass",
    solar: "hourglass-linear"
  },
  alarm: {
    phosphor: "alarm-light",
    lucide: "alarm-clock",
    solar: "alarm-linear"
  },
  asterisk: {
    phosphor: "asterisk-light",
    lucide: "asterisk",
    solar: "star-linear"
  },
  "circle-dashed": {
    phosphor: "circle-dashed-light",
    lucide: "circle-dashed",
    solar: "circle-linear"
  },
  "arrows-in": {
    phosphor: "arrows-in-line-horizontal-light",
    lucide: "minimize",
    solar: "minimize-linear"
  },
  "arrows-out-simple": {
    phosphor: "arrows-out-simple-light",
    lucide: "maximize-2",
    solar: "maximize-linear"
  },
  "arrow-bend-down-right": {
    phosphor: "arrow-bend-down-right-light",
    lucide: "corner-down-right",
    solar: "arrow-right-down-linear"
  },
  "arrow-bend-up-right": {
    phosphor: "arrow-bend-up-right-light",
    lucide: "corner-up-right",
    solar: "arrow-right-up-linear"
  },
  "arrow-fat-lines-up": {
    phosphor: "arrow-fat-lines-up-light",
    lucide: "chevrons-up",
    solar: "double-alt-arrow-up-linear"
  },
  "pencil-simple-slash": {
    phosphor: "pencil-simple-slash-light",
    lucide: "edit-off",
    solar: "pen-new-square-linear"
  },
  "pencil-simple-line": {
    phosphor: "pencil-simple-line-light",
    lucide: "edit",
    solar: "pen-new-square-linear"
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
  "square-split-horizontal": {
    phosphor: "square-split-horizontal-light",
    lucide: "columns",
    solar: "widget-linear"
  },
  "brackets-round": {
    phosphor: "brackets-round-light",
    lucide: "parentheses",
    solar: "widget-linear"
  },

  // Additional missing icons
  text: {
    phosphor: "text-light",
    lucide: "type",
    solar: "text-linear"
  },
  "caret-circle-down": {
    phosphor: "caret-circle-down-light",
    lucide: "chevron-down-circle",
    solar: "arrow-down-linear"
  },
  "currency-dollar": {
    phosphor: "currency-dollar-light",
    lucide: "dollar-sign",
    solar: "dollar-linear"
  },
  translate: {
    phosphor: "translate-light",
    lucide: "languages",
    solar: "translation-linear"
  },
  money: {
    phosphor: "money-light",
    lucide: "banknote",
    solar: "banknote-linear"
  },
  "map-trifold": {
    phosphor: "map-trifold-light",
    lucide: "map",
    solar: "map-linear"
  },
  "cursor-click": {
    phosphor: "cursor-click-light",
    lucide: "mouse-pointer-click",
    solar: "cursor-square-linear"
  },
  note: {
    phosphor: "note-light",
    lucide: "sticky-note",
    solar: "notes-linear"
  },
  "log-out": {
    phosphor: "sign-out-light",
    lucide: "log-out",
    solar: "logout-linear"
  },
  "arrow-u-up-left": {
    phosphor: "arrow-u-up-left-light",
    lucide: "corner-up-left",
    solar: "arrow-left-up-linear"
  },
  "x-circle": {
    phosphor: "x-circle-light",
    lucide: "x-circle",
    solar: "close-circle-linear"
  },
  "dice-three": {
    phosphor: "dice-three-light",
    lucide: "dice-3",
    solar: "dice-linear"
  },
  "paint-brush": {
    phosphor: "paint-brush-light",
    lucide: "paintbrush",
    solar: "palette-linear"
  },
  "dots-six": {
    phosphor: "dots-six-light",
    lucide: "grip",
    solar: "menu-dots-linear"
  },
  "floppy-disk": {
    phosphor: "floppy-disk-light",
    lucide: "save",
    solar: "diskette-linear"
  },
  "arrow-u-up-right": {
    phosphor: "arrow-u-up-right-light",
    lucide: "corner-up-right",
    solar: "arrow-right-up-linear"
  },
  "dots-six-vertical": {
    phosphor: "dots-six-vertical-bold",
    lucide: "grip-vertical",
    solar: "menu-dots-bold"
  },
  house: {
    phosphor: "house-light",
    lucide: "home",
    solar: "home-linear"
  },
  sidebar: {
    phosphor: "sidebar-light",
    lucide: "panel-left",
    solar: "sidebar-minimalistic-linear"
  },
  "chalkboard-simple": {
    phosphor: "chalkboard-simple-light",
    lucide: "presentation",
    solar: "presentation-graph-linear"
  },
  clipboard: {
    phosphor: "clipboard-light",
    lucide: "clipboard",
    solar: "clipboard-linear"
  },
  command: {
    phosphor: "command-light",
    lucide: "command",
    solar: "command-linear"
  },
  "head-circuit": {
    phosphor: "head-circuit-light",
    lucide: "brain-circuit",
    solar: "cpu-linear"
  },
  "chart-line-up": {
    phosphor: "chart-line-up-light",
    lucide: "trending-up",
    solar: "chart-linear"
  },
  "person-simple": {
    phosphor: "person-simple-light",
    lucide: "user",
    solar: "user-linear"
  },
  gear: {
    phosphor: "gear-fine-light",
    lucide: "settings",
    solar: "settings-linear"
  },
  chats: {
    phosphor: "chats-light",
    lucide: "messages-square",
    solar: "chat-round-line-linear"
  },
  "video-camera": {
    phosphor: "video-conference-light",
    lucide: "video",
    solar: "videocamera-linear"
  },
  "discord-logo": {
    phosphor: "discord-logo-light",
    lucide: "gamepad-2",
    solar: "gamepad-linear"
  },
  "reddit-logo": {
    phosphor: "reddit-logo-light",
    lucide: "circle",
    solar: "reddit-linear"
  },
  "instagram-logo": {
    phosphor: "instagram-logo-light",
    lucide: "instagram",
    solar: "instagram-linear"
  },
  butterfly: {
    phosphor: "butterfly-light",
    lucide: "butterfly",
    solar: "butterfly-linear"
  },
  flag: {
    phosphor: "flag-light",
    lucide: "flag",
    solar: "flag-linear"
  },
  lightbulb: {
    phosphor: "lightbulb-light",
    lucide: "lightbulb",
    solar: "lightbulb-linear"
  },
  wallet: {
    phosphor: "wallet-light",
    lucide: "wallet",
    solar: "wallet-linear"
  },
  "github-logo": {
    phosphor: "github-logo-light",
    lucide: "github",
    solar: "github-linear"
  },
  book: {
    phosphor: "book-light",
    lucide: "book",
    solar: "book-linear"
  },
  camera: {
    phosphor: "camera-light",
    lucide: "camera",
    solar: "camera-linear"
  },
  microphone: {
    phosphor: "microphone-light",
    lucide: "mic",
    solar: "microphone-linear"
  },
  "terminal-window": {
    phosphor: "terminal-window-light",
    lucide: "terminal",
    solar: "programming-linear"
  },
  play: {
    phosphor: "play-light",
    lucide: "play",
    solar: "play-linear"
  },
  "chevron-up": {
    phosphor: "caret-up-light",
    lucide: "chevron-up",
    solar: "alt-arrow-up-linear"
  }
};

export type IconSet = "phosphor" | "lucide" | "solar";
