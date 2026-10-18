import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { checkWorkspaceExports } from "./workspace-exports.mjs";
import {
  readAppAliases,
  resolveAppImport,
  checkAppAssemblyImport
} from "./app-imports.mjs";
import { checkWorkspaceDependencies } from "./workspace-dependencies.mjs";
import {
  checkClientDependencyMatrix,
  checkClientManifestMatrix
} from "./client-dependency-matrix.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const aliases = Object.entries(
  JSON.parse(fs.readFileSync(path.join(root, "tools/alias-map.json"), "utf8"))
).sort((a, b) => b[0].length - a[0].length);
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root, encoding: "utf8" }
)
  .split("\0")
  .filter(
    (file) =>
      /\.(?:[cm]?[jt]sx?|svelte)$/.test(file) &&
      fs.existsSync(path.join(root, file))
  );
const sourceFiles = new Set(files);
const appHosts = files
  .filter((file) => /^apps\/[^/]+\/svelte\.config\.[cm]?js$/.test(file))
  .map((file) =>
    readAppAliases(file, fs.readFileSync(path.join(root, file), "utf8"))
  );
const resolutionDiagnostics = [];
const sourceImports = [];
const edges = [];
const externalImports = [];
const retiredImports = [];
const retiredStoreMethods = new Map([
  [
    "client/shared-state/app-context/app.store.ts",
    new Set([
      "gotoPath",
      "openResource",
      "closeResource",
      "runAction",
      "runResourceAction",
      "initiateOAuth2Flow"
    ])
  ],
  [
    "client/runtime/account/account.store.ts",
    new Set([
      "init",
      "signIn",
      "signOut",
      "gotoPostAuthRoute",
      "embedOAuthSignin",
      "signInFromAuthFnSession",
      "refreshPlanData",
      "logGuest",
      "startOfflineSession",
      "bootstrap",
      "checkIfSessionExpired",
      "delete",
      "confirmDelete",
      "uploadFile",
      "uploadFileV2",
      "getSignedUrl",
      "saveLocalFile",
      "tempUploadToS3",
      "modifySubscription",
      "initiateSubscription",
      "restorePurchase",
      "verifyPayment"
    ])
  ],
  [
    "client/shared-state/preferences/ui-state/uiState.store.ts",
    new Set(["addResourceToTabs", "removeResourceFromTabs", "toggleSidebar"])
  ]
]);
const retiredClientPaths = new Set(
  JSON.parse(
    fs.readFileSync(
      path.join(root, "tools/check/retired-client-paths.json"),
      "utf8"
    )
  ).map((file) => file.replace(/\.(ts|svelte)$/, ""))
);
const retiredOwnershipPaths = new Set([
  "client/products/product.resolver",
  "client/config/product-resources",
  "client/runtime/commands/command-kind",
  "client/config/metadata.type",
  "client/config/events/focus-event.enum",
  "client/config/events/memory-event.enum",
  "client/config/events/clipper-event.type",
  "client/shell/leftPanel/LeftNavOfflineStatus.svelte",
  "client/shared-state/resources/resource.actions",
  "client/shared-state/resources/bulk-editor",
  "shared/utils/utils",
  "shared/utils/surreal.utils",
  "client/persistence/persistence.utils",
  "client/persistence/legacyLocalDataBackup",
  "client/surfaces/settings/ExtensionLoginStatusPage.svelte",
  "client/surfaces/settings/ShareToFriends.svelte"
]);

/** Resolves aliases and relative source imports before applying ownership rules. */
function resolveImport(specifier, importer) {
  specifier = specifier.split("?")[0];
  const appImport = resolveAppImport(specifier, importer, appHosts);
  if (appImport) return appImport.targets.map(resolveSource);
  let target;
  if (specifier.startsWith("."))
    target = path.posix.normalize(
      path.posix.join(path.posix.dirname(importer), specifier)
    );
  else {
    const alias = aliases.find(
      ([name]) => specifier === name || specifier.startsWith(`${name}/`)
    );
    if (alias) target = alias[1] + specifier.slice(alias[0].length);
  }
  return target ? [resolveSource(target)] : [];
}

/** Resolves source extensions while preserving missing targets for diagnostics. */
function resolveSource(target) {
  return (
    [
      target,
      `${target}.ts`,
      `${target}.svelte`,
      `${target}.js`,
      `${target}/index.ts`,
      `${target}/index.js`,
      target.replace(/\.js$/, ".ts")
    ].find((candidate) => sourceFiles.has(candidate)) ?? target
  );
}

for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  const scripts = file.endsWith(".svelte")
    ? [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(
        (match) => match[1]
      )
    : [text];
  for (const script of scripts) {
    const source = ts.createSourceFile(
      file,
      script,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    const visit = (node) => {
      if (
        (ts.isMethodDeclaration(node) || ts.isPropertyAssignment(node)) &&
        retiredStoreMethods.get(file)?.has(node.name.getText(source))
      )
        retiredImports.push({
          from: file,
          to: node.name.getText(source),
          reason: "Domain behavior returned to a shared state module"
        });
      let specifier;
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        specifier = node.moduleSpecifier.text;
      else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      )
        specifier = node.argument.literal.text;
      else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          /^(require|vi\.(mock|doMock|importActual|importMock))$/.test(
            node.expression.getText(source)
          )) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        specifier = node.arguments[0].text;
      if (specifier) {
        const relativeTarget = specifier.startsWith(".")
          ? path.posix.normalize(
              path.posix.join(path.posix.dirname(file), specifier)
            )
          : specifier;
        if (
          /^@nucleum\/client\/utils(?:\/|$)/.test(specifier) ||
          /^(?:\$lib\/)?client\/utils(?:\/|$)/.test(relativeTarget)
        )
          retiredImports.push({
            from: file,
            to: specifier,
            reason: "Retired utility workspace; import its semantic owner"
          });
        if (
          /^(?:@21n\/utils\/(?:browser\.utils|account\.utils|network\.utils|ui\.utils|utils)|@nucleum\/persistence\/persistence|@nucleum\/extensions\/clipper\/contentScripts\/store|@nucleum\/surfaces\/commandBar\/actionMap)(?:\.(?:ts|js))?$/.test(
            specifier
          )
        ) {
          retiredImports.push({
            from: file,
            to: specifier,
            reason: "Retired catch-all module; import its semantic owner"
          });
        }
        if (
          /^@nucleum\/client\/(?:shell|surfaces|shared-state|ui|features|composition|application)(?:\/|$)/.test(
            specifier
          )
        )
          retiredImports.push({
            from: file,
            to: specifier,
            reason:
              "Use the explicit owning workspace subpath, not the client alias"
          });
        if (/^@nucleum\/cx(?:\/|$)/.test(specifier))
          retiredImports.push({
            from: file,
            to: specifier,
            reason: "Retired empty workspace"
          });
        if (
          /^@(?:21n\/elements|nucleum\/(?:actions|components|stores))(?:\/|$)/.test(
            specifier
          )
        )
          retiredImports.push({
            from: file,
            to: specifier,
            reason: "Retired client workspace alias"
          });
        if (
          /^@21n\/(?:utils|branding|illustrations|layout|icons|icons-v2)(?:\/|$)/.test(
            specifier
          ) ||
          /^@nucleum\/client\/(?:commands|events|state)(?:\/|$)/.test(
            specifier
          ) ||
          /^@nucleum\/application(?:\/|$)/.test(specifier) ||
          /^@nucleum\/client\/(?:appearance|files|notifications|preferences|resources|shortcuts)(?:\/|$)/.test(
            specifier
          ) ||
          /^@21n\/ui\/elements\/(?:environment|hosts)(?:\/|$)/.test(specifier)
        )
          retiredImports.push({
            from: file,
            to: specifier,
            reason: "Relocated package subpath"
          });
        if (
          /^@21n\/(types|shared-types)(\/|$)/.test(specifier) ||
          /(?:^|\/)client\/types(?:\/|$)|(?:^|\/)shared\/types(?:\/|$)/.test(
            specifier
          )
        )
          retiredImports.push({
            from: file,
            to: specifier,
            reason: "Retired type package"
          });
        const targets = resolveImport(specifier, file);
        const target = targets[0];
        sourceImports.push({ from: file, specifier, targets });
        retiredImports.push(...checkAppAssemblyImport(file, specifier));
        if (
          /^(client|apps)\//.test(file) &&
          !/\.(test|spec|stories)\./.test(file) &&
          !file.includes("/tests/") &&
          ((targets.length &&
            targets.some((item) => !fs.existsSync(path.join(root, item)))) ||
            (specifier.startsWith("$") &&
              !targets.length &&
              !resolveAppImport(specifier, file, appHosts)?.framework &&
              !resolveAppImport(specifier, file, appHosts)?.generated))
        )
          resolutionDiagnostics.push({
            from: file,
            to: specifier,
            reason: "Unresolved local import",
            targets
          });
        if (
          target &&
          (/^client\/(?:actions|branding|commands|components|elements|events|illustrations|stores|layout|icons|iconsV2|state)(?:\/|$)/.test(
            target
          ) ||
            /^client\/application(?:\/|$)/.test(target) ||
            /^client\/(?:appearance|files|notifications|preferences|resources|shortcuts)(?:\/|$)/.test(
              target
            ) ||
            /^client\/ui\/elements\/(?:environment|hosts)(?:\/|$)/.test(target))
        )
          retiredImports.push({
            from: file,
            to: target,
            reason: "Retired client workspace path"
          });
        if (
          target &&
          retiredClientPaths.has(target.replace(/\.(ts|svelte)$/, ""))
        )
          retiredImports.push({
            from: file,
            to: target,
            reason: "Relocated reusable application module"
          });
        if (
          (target && retiredOwnershipPaths.has(target)) ||
          (target &&
            retiredOwnershipPaths.has(target.replace(/\.(ts|js)$/, "")))
        )
          retiredImports.push({
            from: file,
            to: target,
            reason: "Relocated semantic owner"
          });
        if (target) {
          const typeOnly =
            ts.isImportTypeNode(node) ||
            (ts.isImportDeclaration(node) &&
              Boolean(
                node.importClause?.isTypeOnly ||
                (!node.importClause?.name &&
                  node.importClause?.namedBindings &&
                  ts.isNamedImports(node.importClause.namedBindings) &&
                  node.importClause.namedBindings.elements.length > 0 &&
                  node.importClause.namedBindings.elements.every(
                    (item) => item.isTypeOnly
                  ))
              )) ||
            (ts.isExportDeclaration(node) && Boolean(node.isTypeOnly));
          for (const to of targets)
            edges.push({
              from: file,
              to,
              typeOnly,
              ...(specifier.startsWith("$local/") ? { appHost: true } : {})
            });
        } else externalImports.push({ from: file, to: specifier });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}

const production = ({ from }) =>
  !/\.(test|spec)\./.test(from) && !from.includes("/tests/");
const portableUiRoots = ["client/ui/"];
const portableUiDependencies = ["client/theme/", "client/ui/", "shared/"];

/** Returns whether a portable UI source may import the resolved target. */
function isAllowedPortableUiDependency(from, to) {
  if (
    /client\/ui\/(?:actions|elements|environment|hosts|icons|illustrations|branding)\//.test(
      from
    ) &&
    to.startsWith("client/ui/compositions/")
  )
    return false;
  return portableUiDependencies.some((prefix) => to.startsWith(prefix));
}

const violations = edges.filter(production).filter(({ from, to }) => {
  if (
    from === "client/shared-state/app-context/app.store.ts" &&
    (/^client\/(composition|surfaces|shell|features|products)\//.test(to) ||
      to === "client/runtime/account/account.store.ts")
  )
    return true;
  if (
    /^client\/shared-state\/resources\/recent(?:\.store|\.type|-host)\.ts$/.test(
      from
    ) &&
    (/^client\/(composition|surfaces|shell|features|products)\//.test(to) ||
      to === "client/shared-state/app-context/app.store.ts")
  )
    return true;
  if (
    /^(schema|shared|services|server)\//.test(from) &&
    to.startsWith("client/")
  )
    return true;
  if (
    from.startsWith("client/features/") &&
    (to.startsWith("client/products/") ||
      to.startsWith("client/composition/") ||
      to.startsWith("client/surfaces/"))
  )
    return true;
  if (
    from.startsWith("client/surfaces/") &&
    to.startsWith("client/composition/")
  )
    return true;
  if (
    from.startsWith("client/shell/") &&
    (to.startsWith("client/products/") ||
      to.startsWith("client/composition/") ||
      to.startsWith("client/surfaces/"))
  )
    return true;
  if (
    from === "client/shared-state/resources/record-renderer.ts" &&
    (/^client\/(composition|surfaces|shell|features|products)\//.test(to) ||
      to === "client/shared-state/app-context/app.store.ts")
  )
    return true;
  if (
    portableUiRoots.some((prefix) => from.startsWith(prefix)) &&
    !isAllowedPortableUiDependency(from, to)
  )
    return true;
  if (
    /^client\/(datafn|runtime)\//.test(from) &&
    /^client\/(features|products|composition|surfaces|shell|shared-state|ui|events)\//.test(
      to
    )
  )
    return true;
  if (
    /^client\/shared-state\/resources\/resource-action-host\.ts$/.test(from) &&
    (/^client\/(composition|surfaces|shell|products)\//.test(to) ||
      (to.startsWith("client/features/") &&
        to !== "client/datafn/link.type.ts"))
  )
    return true;
  if (
    /^client\/(shared-state\/resources\/(resource-panel[^/]*|panelParam\.mixin|panelSwitcher\.mixin)\.ts|features\/records\/ResourcePanelSwitcher\.svelte)$/.test(
      from
    ) &&
    (/^client\/(composition|surfaces|shell|features|products)\//.test(to) ||
      to === "client/shared-state/app-context/app.store.ts")
  )
    return true;
  if (
    (from.startsWith("client/shared-state/shortcuts/") ||
      from ===
        "client/ui/compositions/keyboard/ComponentShortcutListener.svelte") &&
    (/^client\/(composition|surfaces|shell|features|products)\//.test(to) ||
      to === "client/shared-state/app-context/app.store.ts")
  )
    return true;
  if (
    from.startsWith("client/shared-state/") &&
    /^client\/(composition|surfaces|shell|features|products)\//.test(to)
  )
    return true;
  if (
    from === "client/features/focus/composition.utils.ts" &&
    to === "client/features/focus/session.store.ts"
  )
    return true;
  return false;
});
violations.push(...retiredImports);
const clientDependencyMatrix = JSON.parse(
  fs.readFileSync(
    path.join(root, "tools/check/client-dependency-matrix.json"),
    "utf8"
  )
);
violations.push(
  ...checkClientDependencyMatrix(
    edges.filter(production),
    clientDependencyMatrix,
    files.filter((file) => production({ from: file }))
  )
);
const clientManifests = Object.keys(clientDependencyMatrix)
  .map((owner) => ({
    owner,
    file: path.join(root, "client", owner, "package.json")
  }))
  .filter(({ file }) => fs.existsSync(file))
  .map(({ owner, file }) => ({
    owner,
    manifest: JSON.parse(fs.readFileSync(file, "utf8"))
  }));
violations.push(
  ...checkClientManifestMatrix(clientManifests, clientDependencyMatrix)
);
const rootManifest = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8")
);
const retiredWorkspaces = [
  ["client/utils", "@21n/utils"],
  ["client/legacy", "@nucleum/legacy"],
  ["client/cx", "@nucleum/cx"],
  ["client/actions", "@nucleum/actions"],
  ["client/components", "@nucleum/components"],
  ["client/elements", "@21n/elements"],
  ["client/stores", "@nucleum/stores"],
  ["client/layout", "@21n/layout"],
  ["client/icons", "@21n/icons"],
  ["client/iconsV2", "@21n/icons-v2"],
  ["client/state", "@nucleum/client/state"],
  ["client/branding", "@21n/branding"],
  ["client/illustrations", "@21n/illustrations"],
  ["client/application", "@nucleum/application"]
];
for (const [directory, alias] of retiredWorkspaces) {
  if (
    fs.existsSync(path.join(root, directory)) ||
    rootManifest.workspaces.includes(directory) ||
    aliases.some(([name]) => name === alias)
  )
    violations.push({
      from: "package.json",
      to: directory,
      reason: "Retired client workspace"
    });
}
const retiredDirectories = [
  "client/shell/layers/cache",
  "client/shell/layers/analytics",
  "client/shell/layers/support",
  "client/commands",
  "client/events",
  "client/composition/composition",
  "client/composition/branding",
  "client/composition/paint",
  "client/composition/notifications",
  "client/composition/shortcuts",
  "client/composition/cx",
  "client/composition/debug",
  "client/composition/error",
  "client/composition/home",
  "client/composition/maps",
  "client/composition/modal",
  "client/composition/network",
  "client/composition/oauth",
  "client/composition/overview",
  "client/composition/record",
  "client/composition/resource",
  "client/composition/share",
  "client/composition/storybook",
  "client/composition/taco",
  "client/composition/embed",
  "client/appearance",
  "client/files",
  "client/notifications",
  "client/preferences",
  "client/resources",
  "client/shortcuts"
];
for (const directory of retiredDirectories) {
  if (fs.existsSync(path.join(root, directory)))
    violations.push({
      from: "package.json",
      to: directory,
      reason: "Retired client directory"
    });
}
const compositionOwners = new Set(["layers", "chrome"]);
const compositionRootFiles = new Set([
  "AppLoadingView.svelte",
  "ComponentResolver.svelte",
  "SubAtomLogo.svelte",
  "global-commands.ts",
  "configure-hosts.ts",
  "settings-actions.ts",
  "shortcuts.config.ts"
]);
for (const file of files.filter((file) =>
  file.startsWith("client/composition/")
)) {
  const segments = file.split("/");
  if (
    !(segments.length === 3 && compositionRootFiles.has(segments[2])) &&
    !(segments.length > 3 && compositionOwners.has(segments[2]))
  ) {
    violations.push({
      from: file,
      to: "client/composition",
      reason: "Composition source requires an explicit owner"
    });
  }
}
const productionGraph = new Map();
for (const { from, to } of edges.filter(production)) {
  if (!productionGraph.has(from)) productionGraph.set(from, []);
  productionGraph.get(from).push(to);
}
for (const root of productionGraph.keys()) {
  const isPortableUi = portableUiRoots.some((prefix) =>
    root.startsWith(prefix)
  );
  const isSharedFoundation = /^client\/(shared-state)\//.test(root);
  if (!isPortableUi && !isSharedFoundation) continue;
  const pending = [...productionGraph.get(root)];
  const visited = new Set();
  while (pending.length) {
    const target = pending.pop();
    if (visited.has(target)) continue;
    visited.add(target);
    if (
      isPortableUi
        ? !isAllowedPortableUiDependency(root, target)
        : /^client\/(composition|surfaces|shell|features|products)\//.test(
            target
          )
    )
      violations.push({
        from: root,
        to: target,
        reason: isPortableUi
          ? "Portable UI transitively depends on product implementation"
          : "Shared runtime dependency reaches composition"
      });
    pending.push(...(productionGraph.get(target) ?? []));
  }
}
for (const root of productionGraph.keys()) {
  const isSharedMarkdown = root.startsWith("client/ui/elements/markdown/");
  const isIsolatedRuntime = /^client\/runtime\/(embed|inference|audio)\//.test(
    root
  );
  if (!isSharedMarkdown && !isIsolatedRuntime) continue;
  const pending = [...productionGraph.get(root)];
  const visited = new Set();
  while (pending.length) {
    const target = pending.pop();
    if (visited.has(target)) continue;
    visited.add(target);
    if (
      isSharedMarkdown
        ? target.startsWith("client/") &&
          !target.startsWith("client/ui/elements/markdown/")
        : target.startsWith("client/") && !target.startsWith("client/runtime/")
    )
      violations.push({
        from: root,
        to: target,
        reason: isSharedMarkdown
          ? "Shared Markdown presentation transitively depends on frontend implementation"
          : "Runtime transport transitively depends on frontend implementation"
      });
    pending.push(...(productionGraph.get(target) ?? []));
  }
}
const contract = JSON.parse(
  fs.readFileSync(
    path.join(root, "tools/check/feature-entrypoints.json"),
    "utf8"
  )
);
for (const edge of edges.filter(production)) {
  const targetFeature = edge.to.match(/^client\/features\/([^/]+)\//)?.[1];
  if (
    !targetFeature ||
    edge.from.startsWith(`client/features/${targetFeature}/`)
  )
    continue;
  if (!contract.includes(edge.to))
    violations.push({ ...edge, reason: "Feature entry point is not declared" });
}
for (const entry of contract) {
  const capability = entry.split("/").slice(0, 3).join("/") + "/";
  if (
    !edges.some(
      (edge) => edge.to === entry && !edge.from.startsWith(capability)
    )
  )
    violations.push({
      from: "tools/check/feature-entrypoints.json",
      to: entry,
      reason: "Public feature entry has no external consumer"
    });
}
violations.push(...checkWorkspaceDependencies(edges, externalImports));
const exportedPackages = aliases.flatMap(([name, directory]) => {
  const file = path.join(root, directory, "package.json");
  if (!fs.existsSync(file)) return [];
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  return manifest.name === name ? [{ ...manifest, directory }] : [];
});
violations.push(...checkWorkspaceExports(sourceImports, exportedPackages));
if (process.argv.includes("--graph"))
  console.log(JSON.stringify(edges, null, 2));
else {
  for (const diagnostic of resolutionDiagnostics)
    console.error(
      `${diagnostic.from} -> ${diagnostic.to}: ${diagnostic.reason} (${diagnostic.targets.join(", ")})`
    );
  for (const edge of violations)
    console.error(
      `${edge.from} -> ${edge.to}${edge.reason ? `: ${edge.reason}` : ""}`
    );
  console.log(
    `Architecture: ${files.length} source files, ${edges.length} resolved imports, ${violations.length} violations, ${resolutionDiagnostics.length} unresolved local imports.`
  );
}
process.exitCode = violations.length || resolutionDiagnostics.length ? 1 : 0;
