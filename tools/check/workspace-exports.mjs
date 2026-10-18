import path from "node:path";

/** Resolves exact and wildcard public subpaths, honoring explicit exclusions. */
export function resolveExport(exports, subpath) {
  if (!exports || typeof exports !== "object") return undefined;
  if (Object.hasOwn(exports, subpath)) return exports[subpath];
  const pattern = Object.keys(exports)
    .filter((key) => key.includes("*"))
    .sort((a, b) => b.length - a.length)
    .find((key) => {
      const [prefix, suffix] = key.split("*");
      return subpath.startsWith(prefix) && subpath.endsWith(suffix);
    });
  if (!pattern) return undefined;
  const [prefix, suffix] = pattern.split("*");
  const value = subpath.slice(
    prefix.length,
    suffix ? -suffix.length : undefined
  );
  const target = exports[pattern];
  return typeof target === "string" ? target.replaceAll("*", value) : target;
}

/** Detects package imports concealed by filesystem aliases instead of public exports. */
export function checkWorkspaceExports(imports, packages) {
  const violations = [];
  for (const { from, specifier: rawSpecifier, targets } of imports) {
    const specifier = rawSpecifier.split("?")[0];
    if (/\.(test|spec|stories)\./.test(from) || from.includes("/tests/"))
      continue;
    const owner = packages.find(
      (item) => specifier === item.name || specifier.startsWith(`${item.name}/`)
    );
    if (!owner || from.startsWith(`${owner.directory}/`)) continue;
    const subpath =
      specifier === owner.name ? "." : `.${specifier.slice(owner.name.length)}`;
    const target = resolveExport(owner.exports, subpath);
    if (target === undefined || target === null)
      violations.push({
        from,
        to: specifier,
        reason: "Workspace import is not exported"
      });
    else if (typeof target === "string" && targets?.length) {
      const resolved = path.posix.normalize(
        path.posix.join(owner.directory, target)
      );
      const candidates = [
        resolved,
        `${resolved}.ts`,
        `${resolved}.svelte`,
        `${resolved}.js`,
        `${resolved}/index.ts`,
        `${resolved}/index.js`,
        resolved.replace(/\.js$/, ".ts")
      ];
      if (!targets.some((item) => candidates.includes(item)))
        violations.push({
          from,
          to: specifier,
          reason: "Package export target disagrees with source alias"
        });
    }
  }
  return violations;
}
