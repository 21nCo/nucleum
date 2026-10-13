import path from "node:path";
import ts from "typescript";

/** Reads literal SvelteKit aliases without executing adapters or build plugins. */
export function readAppAliases(file, text) {
  const directory = path.posix.dirname(file);
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const aliases = { $lib: path.posix.join(directory, "src/lib") };
  let routes = path.posix.join(directory, "src/routes");
  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      const name = node.name.getText(source).replace(/["']/g, "");
      if (name === "alias" || name === "files") {
        for (const property of node.initializer.properties) {
          if (
            !ts.isPropertyAssignment(property) ||
            !ts.isStringLiteral(property.initializer)
          )
            continue;
          const key = property.name.getText(source).replace(/["']/g, "");
          const target = path.posix.normalize(
            path.posix.join(directory, property.initializer.text)
          );
          if (name === "alias" && key.startsWith("$")) aliases[key] = target;
          if (name === "files" && key === "lib") aliases.$lib = target;
          if (name === "files" && key === "routes") routes = target;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { directory, aliases, routes };
}

/** App-host modules written by build plugins, absent from a clean checkout. */
const GENERATED_APP_MODULES = new Set(["$lib/product.json"]);

/** Expands app-relative imports in every applicable host; framework modules stay external. */
export function resolveAppImport(specifier, importer, hosts) {
  if (/^\$(?:app|env|service-worker)(?:\/|$)/.test(specifier))
    return { framework: true, targets: [] };
  if (GENERATED_APP_MODULES.has(specifier))
    return { framework: false, generated: true, targets: [] };
  if (!specifier.startsWith("$")) return undefined;
  const ownHost = hosts.find((host) =>
    importer.startsWith(`${host.directory}/`)
  );
  const applicable = ownHost
    ? [ownHost]
    : hosts.filter((host) => host.routes.startsWith("client/"));
  const targets = new Set();
  for (const host of applicable) {
    const alias = Object.keys(host.aliases)
      .sort((a, b) => b.length - a.length)
      .find((key) => specifier === key || specifier.startsWith(`${key}/`));
    if (alias)
      targets.add(
        path.posix.normalize(
          host.aliases[alias] + specifier.slice(alias.length)
        )
      );
  }
  return { framework: false, targets: [...targets] };
}

/** Restricts host assembly imports to the route entrypoints. */
export function checkAppAssemblyImport(from, specifier) {
  return specifier.startsWith("$local/") &&
    from.startsWith("client/") &&
    !from.startsWith("client/routes/")
    ? [{ from, to: specifier, reason: "App host imports belong to routes" }]
    : [];
}
