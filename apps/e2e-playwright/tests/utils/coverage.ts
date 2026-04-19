import { existsSync } from "node:fs";
import path from "node:path";
import {
  getE2EProductConfig,
  getE2EProductConfigFromProjectName,
  type ProductName,
  type SurfaceKey
} from "../../config/product-nav.config";

export type CoverageArea = "calendar" | "overview" | "focus" | "library" | "settings";
export type CoverageLayer = "smoke" | "feature";
export type CoverageStatus = "covered" | "missing" | "n/a";

export interface CoverageSuiteDefinition {
  area: CoverageArea;
  layer: CoverageLayer;
  path: string;
  tag: `@${string}`;
  capabilityPaths: readonly string[];
}

export interface CoverageCapabilityDefinition {
  area: CoverageArea;
  feature: string;
  capabilityPath: string;
}

export interface CoverageMatrixRow {
  product: ProductName;
  area: CoverageArea;
  feature: string;
  capabilityPath: string;
  suitePaths: readonly string[];
  tags: readonly `@${string}`[];
  status: CoverageStatus;
}

export interface SurfaceContractsReferencedByArea {
  calendar: readonly SurfaceKey[];
  overview: readonly SurfaceKey[];
  focus: readonly SurfaceKey[];
  library: readonly SurfaceKey[];
  settings: readonly SurfaceKey[];
}

const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

export const coverageSuiteDefinitions: readonly CoverageSuiteDefinition[] = [
  {
    area: "calendar",
    layer: "smoke",
    path: "apps/e2e-playwright/tests/shared/calendar/calendar.spec.ts",
    tag: "@calendar-smoke",
    capabilityPaths: [
      "commands.manualTimeEntry",
      "calendar.manualLogUiEntry",
      "calendar.dateNavigation"
    ]
  },
  {
    area: "calendar",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/calendar/views.spec.ts",
    tag: "@calendar-feature",
    capabilityPaths: [
      "calendar.layouts.bird",
      "calendar.layouts.classic",
      "calendar.views.day",
      "calendar.views.month",
      "calendar.views.year"
    ]
  },
  {
    area: "calendar",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/calendar/right-panel.spec.ts",
    tag: "@calendar-feature",
    capabilityPaths: [
      "calendar.rightPanel.enabled",
      "calendar.rightPanel.panels.timeline",
      "calendar.rightPanel.panels.overview",
      "calendar.rightPanel.panels.notes",
      "calendar.rightPanel.panels.activity"
    ]
  },
  {
    area: "calendar",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/calendar/preferences.spec.ts",
    tag: "@calendar-feature",
    capabilityPaths: ["calendar.persistence.activeView"]
  },
  {
    area: "overview",
    layer: "smoke",
    path: "apps/e2e-playwright/tests/shared/overview/overview.spec.ts",
    tag: "@overview-smoke",
    capabilityPaths: [
      "overview.focusAnalyticsDashboard",
      "overview.tabs.all",
      "overview.tabs.days",
      "overview.tabs.months",
      "overview.tabs.years"
    ]
  },
  {
    area: "overview",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/overview/focus-analytics.spec.ts",
    tag: "@overview-feature",
    capabilityPaths: [
      "overview.focusAnalyticsDashboard",
      "overview.tabs.all",
      "overview.tabs.days",
      "overview.tabs.months",
      "overview.tabs.years"
    ]
  },
  {
    area: "overview",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/overview/memory-panel.spec.ts",
    tag: "@overview-feature",
    capabilityPaths: ["overview.memoryPanelSwitch"]
  },
  {
    area: "focus",
    layer: "smoke",
    path: "apps/e2e-playwright/tests/shared/focus/goal/browse.spec.ts",
    tag: "@focus-smoke",
    capabilityPaths: ["commands.focus"]
  },
  {
    area: "focus",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/focus/goal/quick-focus.spec.ts",
    tag: "@focus-feature",
    capabilityPaths: ["commands.focus"]
  },
  {
    area: "focus",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/focus/goal/record-page.spec.ts",
    tag: "@focus-feature",
    capabilityPaths: ["records.goal", "records.goalTabs"]
  },
  {
    area: "focus",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/focus/task/record-page.spec.ts",
    tag: "@focus-feature",
    capabilityPaths: ["records.task", "records.taskTabs"]
  },
  {
    area: "library",
    layer: "smoke",
    path: "apps/e2e-playwright/tests/shared/collection/collection.spec.ts",
    tag: "@library-smoke",
    capabilityPaths: ["records.collection"]
  },
  {
    area: "library",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/collection/record-page.spec.ts",
    tag: "@library-feature",
    capabilityPaths: [
      "records.collection",
      "records.collectionTabs",
      "records.collectionRename",
      "records.collectionEditor"
    ]
  },
  {
    area: "library",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/memory/node/record-page.spec.ts",
    tag: "@library-feature",
    capabilityPaths: ["records.node", "records.nodeTabs", "records.nodePanels"]
  },
  {
    area: "library",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/session/session.spec.ts",
    tag: "@library-feature",
    capabilityPaths: ["resources.sessions"]
  },
  {
    area: "settings",
    layer: "smoke",
    path: "apps/e2e-playwright/tests/shared/settings/settings.spec.ts",
    tag: "@settings-smoke",
    capabilityPaths: [
      "settings.sharedSidebarSmoke",
      "settings.sharedModeOfInteraction",
      "settings.sharedHotKeyMatrix",
      "settings.sharedShortcutCustomization",
      "settings.accessibilityPanel"
    ]
  },
  {
    area: "settings",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/settings/focus.spec.ts",
    tag: "@settings-feature",
    capabilityPaths: [
      "settings.focusPanel",
      "settings.focusPipToggle"
    ]
  },
  {
    area: "settings",
    layer: "feature",
    path: "apps/e2e-playwright/tests/shared/settings/node.spec.ts",
    tag: "@settings-feature",
    capabilityPaths: ["settings.nodeSettingsPanel", "records.nodePanels"]
  }
] as const;

export const coverageCapabilityDefinitions: readonly CoverageCapabilityDefinition[] = [
  { area: "calendar", feature: "manual-time-entry", capabilityPath: "commands.manualTimeEntry" },
  { area: "calendar", feature: "manual-log-ui-entry", capabilityPath: "calendar.manualLogUiEntry" },
  { area: "calendar", feature: "date-navigation", capabilityPath: "calendar.dateNavigation" },
  { area: "calendar", feature: "bird-layout", capabilityPath: "calendar.layouts.bird" },
  { area: "calendar", feature: "classic-layout", capabilityPath: "calendar.layouts.classic" },
  { area: "calendar", feature: "day-view", capabilityPath: "calendar.views.day" },
  { area: "calendar", feature: "month-view", capabilityPath: "calendar.views.month" },
  { area: "calendar", feature: "year-view", capabilityPath: "calendar.views.year" },
  { area: "calendar", feature: "right-panel", capabilityPath: "calendar.rightPanel.enabled" },
  { area: "calendar", feature: "right-panel-timeline", capabilityPath: "calendar.rightPanel.panels.timeline" },
  { area: "calendar", feature: "right-panel-overview", capabilityPath: "calendar.rightPanel.panels.overview" },
  { area: "calendar", feature: "right-panel-notes", capabilityPath: "calendar.rightPanel.panels.notes" },
  { area: "calendar", feature: "right-panel-activity", capabilityPath: "calendar.rightPanel.panels.activity" },
  { area: "calendar", feature: "view-persistence", capabilityPath: "calendar.persistence.activeView" },
  { area: "overview", feature: "focus-dashboard", capabilityPath: "overview.focusAnalyticsDashboard" },
  { area: "overview", feature: "memory-panel", capabilityPath: "overview.memoryPanelSwitch" },
  { area: "overview", feature: "tab-all", capabilityPath: "overview.tabs.all" },
  { area: "overview", feature: "tab-days", capabilityPath: "overview.tabs.days" },
  { area: "overview", feature: "tab-months", capabilityPath: "overview.tabs.months" },
  { area: "overview", feature: "tab-years", capabilityPath: "overview.tabs.years" },
  { area: "focus", feature: "focus-command", capabilityPath: "commands.focus" },
  { area: "focus", feature: "goal-record", capabilityPath: "records.goal" },
  { area: "focus", feature: "goal-record-tabs", capabilityPath: "records.goalTabs" },
  { area: "focus", feature: "task-record", capabilityPath: "records.task" },
  { area: "focus", feature: "task-record-tabs", capabilityPath: "records.taskTabs" },
  { area: "library", feature: "collection-record", capabilityPath: "records.collection" },
  { area: "library", feature: "collection-tabs", capabilityPath: "records.collectionTabs" },
  { area: "library", feature: "collection-rename", capabilityPath: "records.collectionRename" },
  { area: "library", feature: "collection-editor", capabilityPath: "records.collectionEditor" },
  { area: "library", feature: "node-record", capabilityPath: "records.node" },
  { area: "library", feature: "node-record-tabs", capabilityPath: "records.nodeTabs" },
  { area: "library", feature: "node-content-panel", capabilityPath: "records.nodePanels" },
  { area: "library", feature: "sessions", capabilityPath: "resources.sessions" },
  { area: "settings", feature: "settings-smoke", capabilityPath: "settings.sharedSidebarSmoke" },
  { area: "settings", feature: "focus-panel", capabilityPath: "settings.focusPanel" },
  { area: "settings", feature: "node-panel", capabilityPath: "settings.nodeSettingsPanel" },
  { area: "settings", feature: "mode-of-interaction", capabilityPath: "settings.sharedModeOfInteraction" },
  { area: "settings", feature: "hot-key-matrix", capabilityPath: "settings.sharedHotKeyMatrix" },
  { area: "settings", feature: "shortcut-customization", capabilityPath: "settings.sharedShortcutCustomization" },
  { area: "settings", feature: "focus-pip-toggle", capabilityPath: "settings.focusPipToggle" },
  { area: "settings", feature: "accessibility-panel", capabilityPath: "settings.accessibilityPanel" }
] as const;

export function getCoverageSuitesForArea(area: CoverageArea): CoverageSuiteDefinition[] {
  return coverageSuiteDefinitions.filter((definition) => definition.area === area);
}

export function getCoverageSuitesForLayer(layer: CoverageLayer): CoverageSuiteDefinition[] {
  return coverageSuiteDefinitions.filter((definition) => definition.layer === layer);
}

export function getDocumentedProductNames(): ProductName[] {
  return ["nucleus", "memotron", "pointron"].filter(
    (product): product is ProductName => !!getE2EProductConfig(product as ProductName)
  );
}

export function getSmokeAndFeatureTags(): string[] {
  return Array.from(new Set(coverageSuiteDefinitions.map((definition) => definition.tag)));
}

export function getSurfaceContractsReferenced(): SurfaceContractsReferencedByArea {
  return {
    calendar: [
      "calendar",
      "calendar.layout.classic",
      "calendar.layout.bird",
      "calendar.view.day",
      "calendar.view.month",
      "calendar.view.year",
      "calendar.rightPanel",
      "calendar.panel.timeline",
      "calendar.panel.overview",
      "calendar.panel.notes",
      "calendar.panel.activity"
    ],
    overview: ["overview.focus", "overview.memory"],
    focus: ["focus.quickFocus"],
    library: [
      "library.collections",
      "library.goals",
      "library.tasks",
      "library.nodes"
    ],
    settings: ["settings.focus", "settings.node"]
  };
}

function resolveSuiteDefinitions(capabilityPath: string) {
  return coverageSuiteDefinitions.filter((definition) =>
    definition.capabilityPaths.includes(capabilityPath)
  );
}

function resolveSuiteStatus(suitePaths: readonly string[]): CoverageStatus {
  if (suitePaths.length === 0) return "missing";
  return suitePaths.every((suitePath) => existsSync(path.resolve(repoRoot, suitePath)))
    ? "covered"
    : "missing";
}

function readDotPath(
  value: unknown,
  dotPath: string
): { exists: boolean; value: unknown } {
  return dotPath.split(".").reduce(
    (state, segment) => {
      if (!state.exists || state.value == null || typeof state.value !== "object") {
        return { exists: false, value: undefined };
      }
      if (!(segment in state.value)) {
        return { exists: false, value: undefined };
      }
      return {
        exists: true,
        value: (state.value as Record<string, unknown>)[segment]
      };
    },
    { exists: true, value }
  );
}

function isMatrixCapabilityEnabled(product: ProductName, capabilityPath: string) {
  const config = getE2EProductConfigFromProjectName(product);
  const source =
    capabilityPath.startsWith("resources.") ? config : config.capabilities;
  const lookupPath = capabilityPath.startsWith("resources.")
    ? capabilityPath
    : capabilityPath;
  const result = readDotPath(source, lookupPath);
  if (!result.exists) return false;
  if (typeof result.value === "boolean") return result.value;
  return result.value != null;
}

export function buildCoverageMatrixRows(): CoverageMatrixRow[] {
  return getDocumentedProductNames().flatMap((product) =>
    coverageCapabilityDefinitions.map((definition) => {
      const suiteDefinitions = resolveSuiteDefinitions(definition.capabilityPath);
      const suitePaths = suiteDefinitions.map((definition) => definition.path);
      const tags = Array.from(new Set(suiteDefinitions.map((definition) => definition.tag)));
      const status: CoverageStatus = isMatrixCapabilityEnabled(product, definition.capabilityPath)
        ? resolveSuiteStatus(suitePaths)
        : "n/a";
      return {
        product,
        area: definition.area,
        feature: definition.feature,
        capabilityPath: definition.capabilityPath,
        suitePaths,
        tags,
        status
      };
    })
  );
}

export function buildCoverageSummary(rows = buildCoverageMatrixRows()) {
  const summary = {
    covered: 0,
    missing: 0,
    na: 0
  };
  for (const row of rows) {
    if (row.status === "covered") summary.covered += 1;
    else if (row.status === "missing") summary.missing += 1;
    else summary.na += 1;
  }
  return summary;
}

export function renderCoverageMatrixMarkdown(rows = buildCoverageMatrixRows()) {
  const summary = buildCoverageSummary(rows);
  const lines = [
    "# Playwright Coverage Matrix",
    "",
    `Generated from product config and suite metadata.`,
    "",
    `- Covered rows: ${summary.covered}`,
    `- Missing rows: ${summary.missing}`,
    `- N/A rows: ${summary.na}`,
    "",
    "| Product | Area | Feature | Capability | Status | Suites | Tags |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.product} | ${row.area} | ${row.feature} | \`${row.capabilityPath}\` | ${row.status} | ${row.suitePaths.length > 0 ? row.suitePaths.map((suitePath) => `\`${suitePath}\``).join("<br>") : "—"} | ${row.tags.length > 0 ? row.tags.map((tag) => `\`${tag}\``).join(" ") : "—"} |`
    );
  }

  lines.push("", "## Repo-root verification commands", "");
  lines.push(...renderVerificationCommandsMarkdown());
  return lines.join("\n");
}

export function renderVerificationCommandsMarkdown() {
  return [
    "```bash",
    "npm run test --workspace=e2e-playwright -- --grep @smoke",
    "npm run test --workspace=e2e-playwright -- --grep @feature",
    "npm run test --workspace=e2e-playwright --",
    "```"
  ];
}

export function renderCoverageMatrixJson(rows = buildCoverageMatrixRows()) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary: buildCoverageSummary(rows),
      rows
    },
    null,
    2
  );
}
