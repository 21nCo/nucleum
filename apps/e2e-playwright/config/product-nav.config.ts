import {
  productE2EConfigs,
  type IProductE2ECapabilitiesConfig
} from "../../../client/products/product.e2e-config";

export type ProductName = "nucleus" | "memotron" | "pointron";

export type SurfaceKey =
  | "calendar"
  | "calendar.layout.classic"
  | "calendar.layout.bird"
  | "calendar.view.day"
  | "calendar.view.month"
  | "calendar.view.year"
  | "calendar.rightPanel"
  | "calendar.panel.timeline"
  | "calendar.panel.overview"
  | "calendar.panel.notes"
  | "calendar.panel.activity"
  | "overview.focus"
  | "overview.memory"
  | "focus.quickFocus"
  | "library.collections"
  | "library.goals"
  | "library.tasks"
  | "library.nodes"
  | "settings.focus"
  | "settings.node";

export interface SurfaceRoleAnchor {
  role: "button" | "tab" | "tablist" | "link" | "textbox" | "heading";
  name?: string | RegExp;
}

export interface SurfaceContract {
  route?: string;
  triggerTestId?: string;
  triggerRole?: "button" | "tab" | "link";
  triggerName?: string | RegExp;
  triggerText?: string | RegExp;
  anchorTestIds: readonly string[];
  anchorRoles?: readonly SurfaceRoleAnchor[];
  anchorTexts?: readonly (string | RegExp)[];
}

export interface E2EProductConfig {
  homePath: string;
  appMenuNavLabels: readonly string[];
  timelinePageLabel: string;
  pathByNavLabel: Record<string, string>;
  librarySectionLabel: string;
  includeHomeInNav?: boolean;
  labels: {
    goalResource: string;
  };
  ui: {
    settingsEntryPoint: "topnav-account-settings" | "settings-button";
    quickFocusPanel: boolean;
    taskQuickPinning: boolean;
    taskContextMenuVariant: "nucleum" | "default";
  };
  resources: {
    browse: readonly string[];
  };
  commands: {
    libraryCollections: string | null;
    libraryGoals: string | null;
    libraryNodes: string | null;
    libraryTasks: string | null;
  };
  surfaces: Record<SurfaceKey, SurfaceContract | null>;
  capabilities: IProductE2ECapabilitiesConfig;
}

const e2eProductConfigs = {
  nucleus: {
    homePath: "calendar",
    appMenuNavLabels: ["Focus", "Calendar", "Overview", "Library"] as const,
    timelinePageLabel: "Calendar",
    pathByNavLabel: {
      Focus: "/focus",
      Calendar: "/calendar",
      Overview: "/overview",
      Library: "/library",
      Home: "/"
    },
    librarySectionLabel: "Nucleum",
    includeHomeInNav: false,
    labels: {
      goalResource: "Objectives"
    },
    ui: {
      settingsEntryPoint: "topnav-account-settings",
      quickFocusPanel: true,
      taskQuickPinning: false,
      taskContextMenuVariant: "nucleum"
    },
    resources: {
      browse: ["collection", "goal", "node", "task"] as const
    },
    commands: {
      libraryCollections: null,
      libraryGoals: null,
      libraryNodes: "Nodes",
      libraryTasks: "Tasks"
    },
    surfaces: {
      calendar: {
        route: "/calendar",
        triggerRole: "button",
        triggerName: /^Calendar$/i,
        anchorTestIds: [],
        anchorRoles: [{ role: "button", name: /Today/i }]
      },
      "calendar.layout.classic": {
        route: "/calendar",
        triggerRole: "button",
        triggerName: /^Columns$/i,
        anchorTestIds: [],
        anchorTexts: [/^(?:D|Day|Days|W|Week|M|Month|Y|Year)$/i]
      },
      "calendar.layout.bird": {
        route: "/calendar",
        anchorTestIds: [],
        anchorTexts: [/^(?:P|Parts|D|Day|Days|W|Week|Weeks|M|Month|Months|Y|Year|Years)$/i]
      },
      "calendar.view.day": {
        route: "/calendar",
        triggerText: /^(?:D|Day|Days)$/i,
        anchorTestIds: [],
        anchorTexts: [
          /^(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i
        ]
      },
      "calendar.view.month": {
        route: "/calendar",
        triggerText: /^(?:M|Month|Months)$/i,
        anchorTestIds: [],
        anchorTexts: [/^Sun$/i, /^Mon$/i, /^Tue$/i]
      },
      "calendar.view.year": {
        route: "/calendar",
        triggerText: /^(?:Y|Year|Years)$/i,
        anchorTestIds: [],
        anchorTexts: [/^Jan$/i, /^Feb$/i, /^Mar$/i]
      },
      "calendar.rightPanel": null,
      "calendar.panel.timeline": null,
      "calendar.panel.overview": null,
      "calendar.panel.notes": null,
      "calendar.panel.activity": null,
      "overview.focus": {
        route: "/overview",
        triggerRole: "button",
        triggerName: /^Overview$/i,
        anchorTestIds: [],
        anchorRoles: [
          { role: "tablist" },
          { role: "tab", name: /^All$/i }
        ]
      },
      "overview.memory": {
        route: "/overview",
        anchorTestIds: [],
        anchorRoles: [{ role: "button", name: /^Memory$/i }]
      },
      "focus.quickFocus": {
        route: "/focus",
        triggerRole: "button",
        triggerName: /^Focus$/i,
        anchorTestIds: ["quick-focus-search"],
        anchorRoles: [
          { role: "textbox", name: /Search a goal to quick focus/i }
        ]
      },
      "library.collections": {
        route: "/library",
        triggerRole: "button",
        triggerName: /^Library$/i,
        anchorTestIds: [],
        anchorRoles: [
          { role: "button", name: /^(Collections)(\s+\d+)?$/i },
          { role: "textbox", name: /Search collections/i }
        ]
      },
      "library.goals": {
        route: "/library",
        anchorTestIds: [],
        anchorRoles: [
          { role: "button", name: /^(Goals|Objectives)(\s+\d+)?$/i },
          { role: "textbox", name: /Search goals/i }
        ]
      },
      "library.tasks": {
        route: "/library",
        anchorTestIds: [],
        anchorRoles: [
          { role: "button", name: /^(Tasks)(\s+\d+)?$/i },
          { role: "textbox", name: /Search tasks/i }
        ]
      },
      "library.nodes": {
        route: "/library",
        anchorTestIds: [],
        anchorRoles: [
          { role: "button", name: /^(Nodes)(\s+\d+)?$/i },
          { role: "textbox", name: /Search nodes/i }
        ]
      },
      "settings.focus": {
        anchorTestIds: ["topnav-account-settings"],
        anchorRoles: [{ role: "button", name: /^Focus$/i }]
      },
      "settings.node": {
        anchorTestIds: ["topnav-account-settings"],
        anchorRoles: [{ role: "button", name: /^Node settings$/i }]
      }
    },
    capabilities: productE2EConfigs.nucleus.capabilities
  },
  memotron: {
    homePath: "calendar",
    appMenuNavLabels: ["Capture", "Calendar", "Overview", "Library"] as const,
    timelinePageLabel: "Calendar",
    pathByNavLabel: {
      Capture: "/capture",
      Calendar: "/calendar",
      Overview: "/overview",
      Library: "/library",
      Home: "/"
    },
    librarySectionLabel: "Memory",
    labels: {
      goalResource: "Goals"
    },
    ui: {
      settingsEntryPoint: "settings-button",
      quickFocusPanel: false,
      taskQuickPinning: false,
      taskContextMenuVariant: "default"
    },
    resources: {
      browse: ["collection", "node"] as const
    },
    commands: {
      libraryCollections: "Collections",
      libraryGoals: null,
      libraryNodes: "Nodes",
      libraryTasks: null
    },
    surfaces: {
      calendar: {
        route: "/calendar",
        triggerRole: "button",
        triggerName: /^Calendar$/i,
        anchorTestIds: [],
        anchorRoles: [{ role: "button", name: /Today/i }]
      },
      "calendar.layout.classic": null,
      "calendar.layout.bird": {
        route: "/calendar",
        anchorTestIds: [],
        anchorTexts: [/^(?:P|Parts|D|Day|Days|W|Week|Weeks|M|Month|Months|Y|Year|Years)$/i]
      },
      "calendar.view.day": {
        route: "/calendar",
        triggerText: /^(?:D|Day|Days)$/i,
        anchorTestIds: [],
        anchorTexts: [
          /^(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i
        ]
      },
      "calendar.view.month": {
        route: "/calendar",
        triggerText: /^(?:M|Month|Months)$/i,
        anchorTestIds: [],
        anchorTexts: [/^Sun$/i, /^Mon$/i, /^Tue$/i]
      },
      "calendar.view.year": {
        route: "/calendar",
        triggerText: /^(?:Y|Year|Years)$/i,
        anchorTestIds: [],
        anchorTexts: [/^Jan$/i, /^Feb$/i, /^Mar$/i]
      },
      "calendar.rightPanel": null,
      "calendar.panel.timeline": null,
      "calendar.panel.overview": null,
      "calendar.panel.notes": null,
      "calendar.panel.activity": null,
      "overview.focus": null,
      "overview.memory": null,
      "focus.quickFocus": null,
      "library.collections": {
        route: "/library",
        triggerRole: "button",
        triggerName: /^Library$/i,
        anchorTestIds: [],
        anchorRoles: [
          { role: "button", name: /^(Collections)(\s+\d+)?$/i },
          { role: "textbox", name: /Search collections/i }
        ]
      },
      "library.goals": null,
      "library.tasks": null,
      "library.nodes": {
        route: "/library",
        anchorTestIds: [],
        anchorRoles: [
          { role: "button", name: /^(Nodes)(\s+\d+)?$/i },
          { role: "textbox", name: /Search nodes/i }
        ]
      },
      "settings.focus": null,
      "settings.node": {
        anchorTestIds: ["settings-button"],
        anchorRoles: [{ role: "button", name: /^Node settings$/i }]
      }
    },
    capabilities: productE2EConfigs.memotron.capabilities
  },
  pointron: {
    homePath: "calendar",
    appMenuNavLabels: ["Focus", "Calendar", "Overview", "Library"] as const,
    timelinePageLabel: "Calendar",
    pathByNavLabel: {
      Focus: "/focus",
      Calendar: "/calendar",
      Overview: "/overview",
      Library: "/library",
      Home: "/"
    },
    librarySectionLabel: "Focus",
    labels: {
      goalResource: "Goals"
    },
    ui: {
      settingsEntryPoint: "settings-button",
      quickFocusPanel: true,
      taskQuickPinning: false,
      taskContextMenuVariant: "default"
    },
    resources: {
      browse: ["collection", "goal", "task"] as const
    },
    commands: {
      libraryCollections: "Collections",
      libraryGoals: "Goals",
      libraryNodes: null,
      libraryTasks: "Tasks"
    },
    surfaces: {
      calendar: {
        route: "/calendar",
        triggerRole: "button",
        triggerName: /^Calendar$/i,
        anchorTestIds: [],
        anchorRoles: [{ role: "button", name: /Today/i }]
      },
      "calendar.layout.classic": null,
      "calendar.layout.bird": {
        route: "/calendar",
        anchorTestIds: [],
        anchorTexts: [/^(?:P|Parts|D|Day|Days|W|Week|Weeks|M|Month|Months|Y|Year|Years)$/i]
      },
      "calendar.view.day": {
        route: "/calendar",
        triggerText: /^(?:D|Day|Days)$/i,
        anchorTestIds: [],
        anchorTexts: [
          /^(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i
        ]
      },
      "calendar.view.month": {
        route: "/calendar",
        triggerText: /^(?:M|Month|Months)$/i,
        anchorTestIds: [],
        anchorTexts: [/^Sun$/i, /^Mon$/i, /^Tue$/i]
      },
      "calendar.view.year": {
        route: "/calendar",
        triggerText: /^(?:Y|Year|Years)$/i,
        anchorTestIds: [],
        anchorTexts: [/^Jan$/i, /^Feb$/i, /^Mar$/i]
      },
      "calendar.rightPanel": null,
      "calendar.panel.timeline": null,
      "calendar.panel.overview": null,
      "calendar.panel.notes": null,
      "calendar.panel.activity": null,
      "overview.focus": {
        route: "/overview",
        triggerRole: "button",
        triggerName: /^Overview$/i,
        anchorTestIds: [],
        anchorRoles: [
          { role: "tablist" },
          { role: "tab", name: /^All$/i }
        ]
      },
      "overview.memory": null,
      "focus.quickFocus": {
        route: "/focus",
        triggerRole: "button",
        triggerName: /^Focus$/i,
        anchorTestIds: ["quick-focus-search"],
        anchorRoles: [
          { role: "textbox", name: /Search a goal to quick focus/i },
          { role: "tab", name: /^Quick Focus$/i }
        ]
      },
      "library.collections": {
        route: "/library",
        triggerRole: "button",
        triggerName: /^Library$/i,
        anchorTestIds: [],
        anchorRoles: [
          { role: "button", name: /^(Collections)(\s+\d+)?$/i },
          { role: "textbox", name: /Search collections/i }
        ]
      },
      "library.goals": {
        route: "/library",
        anchorTestIds: [],
        anchorRoles: [
          { role: "button", name: /^(Goals)(\s+\d+)?$/i },
          { role: "textbox", name: /Search goals/i }
        ]
      },
      "library.tasks": {
        route: "/library",
        anchorTestIds: [],
        anchorRoles: [
          { role: "button", name: /^(Tasks)(\s+\d+)?$/i },
          { role: "textbox", name: /Search tasks/i }
        ]
      },
      "library.nodes": null,
      "settings.focus": {
        anchorTestIds: ["settings-button"],
        anchorRoles: [{ role: "button", name: /^Focus$/i }]
      },
      "settings.node": null
    },
    capabilities: productE2EConfigs.pointron.capabilities
  }
} satisfies Record<ProductName, E2EProductConfig>;

export function getE2EProductConfig(
  product: ProductName
): E2EProductConfig {
  return e2eProductConfigs[product];
}

export function getE2EProductConfigFromProjectName(
  projectName: string
): E2EProductConfig {
  if (projectName === "pointron") return e2eProductConfigs.pointron;
  if (projectName === "memotron") return e2eProductConfigs.memotron;
  return e2eProductConfigs.nucleus;
}

export type NucleusAppMenuLabel =
  (typeof e2eProductConfigs)["nucleus"]["appMenuNavLabels"][number];
