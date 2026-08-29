import { iconMappings } from "@21n/icons-v2/icons.map";

// Phosphor icons that are NOT in icons.map.ts (these will still use phosphor directly)
const phosphorIcons = [
  // Star variants
  "star-half",

  // Navigation and Arrows
  "arrow-elbow-left-up",
  "arrows-out-cardinal",
  "arrows-out-line-horizontal",
  "arrows-clockwise",
  "arrow-line-down",
  "arrow-line-up",
  "arrow-line-left",
  "arrow-line-right",
  "arrow-line-up-right",
  "arrow-line-down-left",
  "arrow-line-down-left",
  "arrow-line-down-right",
  "arrow-counter-clockwise",
  "arrow-arc-left",
  "arrow-square-in",
  "arrow-square-up-right",
  "arrow-fat-up",
  "arrow-fat-down",
  "arrow-fat-line-up",
  "arrow-fat-line-down",
  "arrow-fat-lines-down",
  "arrow-bend-up-left",
  "arrow-bend-left-up",
  "arrow-bend-right-up",
  "arrow-bend-double-up-right",
  "arrow-u-down-left",

  //Carets
  "caret-circle-left",
  "caret-circle-right",
  "caret-line-down",
  "caret-line-up",
  "caret-line-left",
  "caret-line-right",
  "caret-double-down",
  "caret-double-up",
  "caret-double-left",
  "caret-double-right",
  "caret-circle-double-down",
  "caret-circle-double-up",
  "caret-circle-double-left",
  "caret-circle-double-right",

  // UI Controls
  "dots-nine",
  "dots-three-circle",
  "dots-three-circle-vertical",
  "dots-three-outline",
  "dots-three-outline-vertical",
  // Media and Files
  "file-csv",
  "file-html",
  "file-txt",
  "file-zip",
  "file-doc",
  "file-ppt",
  "file-xls",
  "file-text",
  "file-audio",

  // Actions
  "download-simple",
  "link-simple-break",
  "link-simple-horizontal-break",
  "faders",

  // Layout and View
  "align-left-simple",
  "align-top-simple",
  "align-right-simple",

  // Status and Info
  "lock-simple",
  "circle-bold",
  "circles-four",

  // Misc
  "book-open-text",
  "brain",
  "cube",
  "leaf",
  "clock-countdown",
  "clock-afternoon",
  "clock-clockwise",
  "clock-counter-clockwise",
  "gradient",
  "calendar-range",
  "calendar-blank",
  "dev-to-logo",
  "google-drive-logo",
  "brackets-square",
  "code-simple",
  "gear-six",
  "text-h-five",
  "text-h-six",
  "circuitry",
  "cpu",
  "gift",
  "chat-centered-dots",
  "sign-in",
  "error",
  "android-logo",
  "apple-logo",
  "windows-logo",
  "linux-logo",
  "chrome-logo",
  "firefox-logo",
  "threads-logo",
  "rss-simple",
  "piggy-bank",
  "umbrella-simple",
  "coffee",
  "armchair",
  "currency-circle-dollar",
  "note-blank",
  "clipboard-text",
  "cloud",
  "cloud-check",
  "scroll",
  "columns",
  "rows",
  "sliders",
  "slideshow",
  "rectangle",
  "steps",
  "rectangles-two",
  "push-pin-slash",
  "push-pin-simple-slash",
  "wifi-high",
  "wifi-x",
  "wifi-slash",
  "key",
  "keyhole",
  "perspective",
  "paper-plane",
  "paper-plane-right",
  "paper-plane-tilt",
  "waveform",
  "waveform-slash",
  "wave-sine",

  //Git
  "git-fork",
  "git-commit",
  "git-merge",
  "git-diff",

  //Charts
  "chart-bar-horizontal",
  "chart-polar",
  "chart-donut",
  "chart-scatter",
  "chart-line-down",
  "presentation-chart",
  "cards-three",
  "checkerboard",
  "circles-three",
  "diamonds-four",
  "drone",
  "grid-four",
  "books",
  "compass",
  "navigation-arrow"
];

export const phosphorRatingIcons = [
  "star",
  "fire",
  "fire-simple",
  "heart",
  "heart-straight",
  "book",
  "bookmark-simple",
  "push-pin",
  "push-pin-simple",
  "lightbulb",
  "lightbulb-filament",
  "lightning",
  "confetti",
  "medal",
  "trophy",
  "currency-dollar-simple",
  "currency-btc",
  "drop-simple",

  "smiley",
  "smiley-meh",
  "smiley-sad",
  "smiley-wink",
  "smiley-x-eyes",
  "smiley-nervous",
  "hand-peace",
  "hand-fist",
  "hand-heart",

  "thumbs-up",
  "thumbs-down",
  "plus-circle",
  "minus-circle",

  "circle",
  "diamond",
  "pentagon",
  "hexagon",
  "octagon",
  "hourglass-simple",

  "flag",
  "flag-checkered",
  "flag-pennant",
  "flag-banner",
  "asterisk",

  "person-simple",
  "person-simple-hike",
  "person-simple-bike",
  "person-simple-run",
  "person-simple-walk",
  "person-simple-ski",
  "person-simple-snowboard",
  "person-simple-swim",
  "person-simple-tai-chi",

  "airplane-tilt",
  "campfire",
  "map-pin",
  "footprints",
  "island",
  "mountains",
  "motorcycle",
  "globe-stand",

  "planet",
  "sun",
  "moon",
  "rocket",
  "rocket-launch",
  "snowflake",

  "balloon",
  "paint-brush",
  "paragraph",
  "pen-nib",
  "quotes",
  "puzzle-piece",
  "flower",
  "flower-lotus",
  "plant",
  "potted-plant",
  "music-notes",
  "film-reel",
  "film-slate",
  "bone",
  "paw-print",
  "crown-simple",
  "bowl-steam",
  "avocado",
  "orange"
];

const hugeiconsIcons = [
  "code",
  "solid-line-01",
  "equal-sign",
  "layout-table-02",
  "left-to-right-list-bullet",
  "left-to-right-list-number",
  "check-list",
  "paragraph",
  "quote-up",
  "summation-01",
  "heading-01",
  "heading-02",
  "heading-03",
  "heading-04",
  "sidebar-right",
  "rhombus",
  "rhombus-01"
];

const lucideIcons: string[] = [];

const logos = [
  "github",
  "github-icon",
  "github-copilot",
  "apple",
  "google",
  "microsoft",
  "microsoft-icon",

  //Used in Markdown embed placeholder
  "google-drive",
  "youtube-icon",
  "google-maps",
  "replit-icon",
  "gitlab",
  "figma",
  "typeform-icon",

  "medium-icon",
  "stackoverflow-icon",
  "quora",
  "x",
  "linkedin-icon",
  "facebook",
  "reddit-icon",
  "mastodon-icon",
  "bluesky",
  "vimeo-icon",
  "udemy-icon",
  "openai-icon",
  "claude-icon",
  "mistral-ai-icon",
  "google-icon",
  "google-photos",
  "google-play-icon",
  "google-bard-icon",
  "microsoft-onedrive",
  "perplexity-icon",
  "chrome",
  "firefox",
  "chrome-web-store",
  "digital-ocean-icon",
  "discord-icon",
  "pinterest",
  "scribd-icon",
  "whatsapp-icon"
];

const solarIconsNotInMap = [
  "rewind-10-seconds-back",
  "rewind-10-seconds-forward"
];

const phosphorIconsFromMap = Object.values(iconMappings).map(
  (mapping) => mapping.phosphor
);
const lucideIconsFromMap = Object.values(iconMappings).map(
  (mapping) => mapping.lucide
);
const solarIconsFromMap = Object.values(iconMappings)
  .filter((mapping) => mapping.solar)
  .map((mapping) => mapping.solar!);

export const allPhosphorIcons = Array.from(
  new Set([...phosphorIcons, ...phosphorRatingIcons, ...phosphorIconsFromMap])
);
export const allLucideIcons = Array.from(
  new Set([...lucideIcons, ...lucideIconsFromMap])
);
export const allSolarIcons = Array.from(
  new Set([...solarIconsNotInMap, ...solarIconsFromMap])
);

export const solarLinearIcons = allSolarIcons.map((icon) => icon + "-linear");
export const solarBoldIcons = allSolarIcons.map((icon) => icon + "-bold");
export const solarLineDuotoneIcons = allSolarIcons.map(
  (icon) => icon + "-line-duotone"
);
export const solarBoldDuotoneIcons = allSolarIcons.map(
  (icon) => icon + "-bold-duotone"
);

const simpleIcons = ["wikipedia", "googledocs", "abstract", "mixpanel"];

const skillIcons = [
  "python",
  "javascript",
  "typescript",
  "react",
  "nodejs",
  "svelte",
  "instagram",
  "gmail-light",
  "github-light",
  "mastodon-light"
];

const svgSpinnersIcons = [
  "90-ring-with-bg",
  "3-dots-fade",
  "3-dots-scale",
  "180-ring-with-bg",
  "bars-fade",
  "bars-scale-fade",
  "bars-rotate-fade",
  "bars-scale",
  "bars-scale-middle"
];

const heroiconsIcons = [
  "cog",
  "rectangle-group",
  "rectangle-stack",
  "bookmark",
  "copy",
  "calendar",
  "slash"
];
const heroiconsSolid = heroiconsIcons.map((icon) => icon + "-solid");

const letsIconsIcons = ["color-picker", "color-mode-light"];

const remixIcons = ["sketching"];

const proIcons = ["send", "rhombus"];

const fa6BrandsIcons = ["unsplash"];

const materialSymbolsLightIcons = ["keyboard-hide-outline-rounded"];

const f7Icons = ["keyboard-chevron-compact-down"];

const fluentIcons = ["keyboard-dock-20-regular"];

const fluentEmojiIcons = [
  "astronaut",
  "globe-showing-europe-africa",
  "glowing-star",
  "rocket",
  "potted-plant"
];

const tablerIcons = ["keyboard-show", "hexagon-plus"];

const uilIcons = ["keyboard-hide"];

const mynaUiIcons = [
  "plus-hexagon",
  "check-hexagon",
  "git-commit",
  "git-merge",
  "git-branch",
  "brand-pocket",
  "brand-pocket-solid",
  "terminal",
  "calendar",
  "rhombus"
];
const mynaUiAllIcons = [
  ...mynaUiIcons,
  ...mynaUiIcons.map((icon) => icon + "-solid")
];

export const iconSets = {
  hugeicons: hugeiconsIcons,
  "svg-spinners": svgSpinnersIcons,
  heroicons: [...heroiconsIcons, ...heroiconsSolid],
  "lets-icons": letsIconsIcons,
  ri: remixIcons,
  proicons: proIcons,
  "simple-icons": simpleIcons,
  "skill-icons": skillIcons,
  logos,
  "fa6-brands": fa6BrandsIcons,
  "material-symbols-light": materialSymbolsLightIcons,
  f7: f7Icons,
  fluent: fluentIcons,
  "fluent-emoji": fluentEmojiIcons,
  tabler: tablerIcons,
  uil: uilIcons,
  mynaui: mynaUiAllIcons
};

export const phIcons = {
  base: allPhosphorIcons,
  light: allPhosphorIcons.map((icon) => icon + "-light"),
  fill: allPhosphorIcons.map((icon) => icon + "-fill"),
  duotone: allPhosphorIcons.map((icon) => icon + "-duotone")
};

export const lucideIconsForBundling = {
  base: allLucideIcons
};

export const solarIconsForBundling = {
  base: allSolarIcons,
  linear: solarLinearIcons,
  bold: solarBoldIcons,
  "line-duotone": solarLineDuotoneIcons,
  "bold-duotone": solarBoldDuotoneIcons
};

export const bundleNumber = 66;
