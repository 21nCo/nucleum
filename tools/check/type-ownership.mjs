import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const inventory = JSON.parse(
  fs.readFileSync(
    path.join(root, "docs/architecture/type-ownership-inventory.json"),
    "utf8"
  )
);
const printer = ts.createPrinter({ removeComments: true });
const failures = [];
let enums = 0;
let retiredEnums = 0;
let changedEnums = 0;
let renamedEnums = 0;
/**
 * Runtime enums retired after the baseline, keyed by baseline path. A contract with
 * `retiredPath` retires its whole module; one without it retires only that enum from
 * a module whose other declarations are kept.
 */
const retiredEnumContracts = new Map([
  [
    "client/layout/layers/cache/cache.type.ts",
    [{ name: "CacheKey", retiredPath: "client/shell/layers/cache" }]
  ],
  [
    "client/types/gathery/gatheryEvent.enum.ts",
    [
      {
        name: "GatheryEvent",
        retiredPath: "client/features/spaces/gatheryEvent.enum.ts"
      }
    ]
  ],
  [
    "client/features/spaces/combination/combination.type.ts",
    [{ name: "CombinationType" }]
  ]
]);

/** Runtime enums renamed after the baseline with unchanged members, keyed by baseline path. */
const renamedEnumContracts = new Map([
  [
    "client/features/spaces/combination/combination.type.ts",
    { CombinationNavItemType: "SpaceNavItemType" }
  ]
]);

/** Runtime enums whose members were intentionally changed after the baseline, keyed by baseline path and pinned to their audited members. */
const changedEnumContracts = new Map([
  [
    "client/datafn/resource.type.ts",
    [
      {
        name: "AccessMode",
        members: {
          PAGE: "page",
          BESIDE_BASE: "beside",
          BESIDE_PAGE: "besidePage",
          FULL: "full",
          TAB: "tab",
          OPEN_IN_BACKGROUND: "open-in-background",
          SLIDESHOW: "slideshow",
          SHEET: "sheet",
          PANEL: "panel",
          OVERLAY: "overlay"
        }
      },
      {
        name: "ResourceAccessPoint",
        members: {
          BROWSER: "browser",
          LIBRARY: "library",
          JOURNAL: "journal",
          TABS: "tabs",
          SELF: "self",
          OTHER: "other",
          NODE: "node",
          NODE_LINKS: "nodelinks",
          DEFAULT_RIGHT_PANE_LINKS: "defaultrightpanelinks",
          NODE_TRACES: "nodetraces",
          COLLECTION: "collection",
          SEARCH_RESULT: "searchresult",
          MARKDOWN_EMBED: "markdownembed",
          MARKDOWN_MENTION: "markdownmention",
          MARKDOWN: "markdown",
          SPACE: "space",
          CAPTURE: "capture",
          CLIPPER: "clipper",
          PICKER: "picker",
          FORM: "form",
          OBJECTIVE: "objective",
          FOCUS: "focus",
          CALENDAR: "calendar",
          ANALYTICS: "analytics",
          MAP: "map"
        }
      }
    ]
  ],
  [
    "client/types/appStore.type.ts",
    [
      {
        name: "AppSearchParam",
        members: {
          RETURN_TO: "returnTo",
          BACK: "back",
          EDIT: "edit",
          TYPE: "type",
          TAB: "tab",
          PANEL: "panel",
          VIEW: "view",
          LINK: "link",
          BULK: "bulk",
          MODE: "mode",
          CLIPBOARD: "clipboard",
          STARRED: "starred",
          ARCHIVED: "archived",
          DATE: "date",
          SETTING: "setting",
          CODE: "code",
          TOKEN: "token",
          MSG: "msg",
          EXT: "ext",
          PROVIDER: "provider",
          GUEST: "guest",
          PAGE_AT: "pageAt",
          BESIDE_PAGE_AT: "besidePageAt",
          BESIDE_AT: "besideAt",
          FULL_AT: "fullAt",
          SELECTED: "selected",
          DEPTH: "depth",
          TRAVERSE: "traverse",
          NODE_VIEW: "nodeView",
          SEARCH: "search",
          RIGHT: "right",
          MAX: "max"
        }
      }
    ]
  ],
  [
    "schema/resource.enum.ts",
    [
      {
        name: "ResourceBase",
        members: {
          ALL: "ALL",
          unknown: "unknown",
          everything: "everything",
          globalPreferences: "globalPreferences",
          preferences: "preferences",
          TailwindTheme: "TailwindTheme",
          appData: "appData",
          space: "space",
          spaceInContext: "spaceInContext",
          appearance: "appearance",
          kv: "kv",
          appMenu: "appMenu",
          accessLog: "accessLog",
          uiState: "uiState",
          navigatorHistory: "navigatorHistory",
          keyboardShortcuts: "keyboardShortcuts",
          mutation: "mutation",
          event: "event",
          tag: "tag",
          import: "import",
          todo: "todo",
          pointronPreferences: "pointronPreferences",
          SessionStore: "SessionStore",
          SessionStoreV2: "SessionStoreV2",
          pointSessionSnapshot: "pointSessionSnapshot",
          pointSessionFocusItems: "pointSessionFocusItems",
          pointSessionSnapshotv2: "pointSessionSnapshotv2",
          pointSessionFocusItemsv2: "pointSessionFocusItemsv2",
          PointSession: "PointSession",
          PointTask: "PointTask",
          PointTag: "PointTag",
          PointLog: "PointLog",
          PointTimer: "PointTimer",
          PointGoal: "PointGoal",
          objective: "objective",
          logsPane: "logsPane",
          targetsPane: "targetsPane",
          focusHeatmap: "focusHeatmap",
          pointAnalyticsConfig: "pointAnalyticsConfig",
          quickFocusItems: "quickFocusItems",
          task: "task",
          session: "session",
          sessionLog: "sessionLog",
          sessionFocusItems: "sessionFocusItems",
          collection: "collection",
          property: "property",
          view: "view",
          file: "file",
          place: "place",
          input: "input",
          curation: "curation",
          nodelinks: "nodelinks",
          capture: "capture",
          type: "type",
          vector: "vector",
          node: "node",
          relation: "relation",
          link: "link",
          linkTag: "linkTag",
          markdownSettings: "markdownSettings",
          highlight: "highlight",
          clipperToolbarState: "clipperToolbarState",
          clipperSync: "clipperSync"
        }
      }
    ]
  ]
]);

/** Serializes an audited enum member contract for comparison with a declaration. */
function memberSignature(members) {
  return JSON.stringify(Object.entries(members));
}

/** Collects runtime enum members as name and initializer pairs. */
function enumMembers(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const result = new Map();
  const visit = (node) => {
    if (ts.isEnumDeclaration(node))
      result.set(
        node.name.text,
        memberSignature(
          Object.fromEntries(
            node.members.map((member) => [
              member.name.getText(source),
              member.initializer && ts.isStringLiteral(member.initializer)
                ? member.initializer.text
                : (member.initializer?.getText(source) ?? null)
            ])
          )
        )
      );
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

/** Collects runtime enums without comments or formatting differences. */
function declarations(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const result = new Map();
  const visit = (node) => {
    if (ts.isEnumDeclaration(node))
      result.set(
        node.name.text,
        printer.printNode(ts.EmitHint.Unspecified, node, source)
      );
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

for (const module of inventory.modules) {
  const candidates = new Map();
  const candidateMembers = new Map();
  for (const destination of module.destinations) {
    const file = path.join(root, destination);
    if (!fs.existsSync(file)) {
      failures.push(`Missing destination: ${destination}`);
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    for (const [name, declaration] of declarations(destination, text))
      candidates.set(name, declaration);
    for (const [name, members] of enumMembers(destination, text))
      candidateMembers.set(name, members);
  }
  if (module.path.endsWith(".svelte")) continue;
  const original = execFileSync(
    "git",
    ["show", `${inventory.baseline}:${module.path}`],
    { cwd: root, encoding: "utf8" }
  );
  for (const [name, declaration] of declarations(module.path, original)) {
    const retired = retiredEnumContracts
      .get(module.path)
      ?.find((contract) => contract.name === name);
    if (retired) {
      const isRestored = retired.retiredPath
        ? module.disposition !== "removed" ||
          module.destinations.length !== 0 ||
          fs.existsSync(path.join(root, retired.retiredPath))
        : candidates.has(name);
      if (isRestored)
        failures.push(`Retired enum ${name} must not be restored`);
      retiredEnums++;
      continue;
    }
    const renamedTo = renamedEnumContracts.get(module.path)?.[name];
    if (renamedTo) {
      const expected = declaration.replace(
        `enum ${name} `,
        `enum ${renamedTo} `
      );
      if (candidates.has(name))
        failures.push(`Renamed enum ${name} must not be restored`);
      else if (candidates.get(renamedTo) !== expected)
        failures.push(`Renamed enum ${name} must match ${renamedTo}`);
      renamedEnums++;
      continue;
    }
    const changed = changedEnumContracts
      .get(module.path)
      ?.find((contract) => contract.name === name);
    if (changed) {
      if (!candidates.has(name))
        failures.push(`Changed enum ${name} is missing from its destination`);
      else if (candidateMembers.get(name) !== memberSignature(changed.members))
        failures.push(`Runtime enum changed: ${module.path}:${name}`);
      changedEnums++;
      continue;
    }
    enums++;
    if (candidates.get(name) !== declaration)
      failures.push(`Runtime enum changed: ${module.path}:${name}`);
  }
}

for (const file of [
  "package.json",
  "package-lock.json",
  "tools/alias-map.json"
]) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (/@21n\/(types|shared-types)"|"(?:client|shared)\/types"/.test(text))
    failures.push(`Retired package in ${file}`);
}
for (const failure of failures) console.error(failure);
console.log(
  `Type ownership: ${inventory.modules.length} module dispositions, ${enums} unchanged runtime enums, ${retiredEnums} audited retired enums, ${changedEnums} audited changed enums, ${renamedEnums} audited renamed enums, ${failures.length} failures.`
);
process.exitCode = failures.length ? 1 : 0;
