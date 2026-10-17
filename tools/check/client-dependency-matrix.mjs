/** Resolves a client source or import to its top-level owner. */
export function clientOwner(file) {
  return file.startsWith("client/") ? file.split("/")[1] : undefined;
}

/** Checks every client import and the permitted owner graph for cycles. */
export function checkClientDependencyMatrix(edges, matrix, files = []) {
  const violations = [];
  const owners = new Set(Object.keys(matrix));
  const visiting = new Set();
  const visited = new Set();

  function visit(owner, path) {
    if (visiting.has(owner)) {
      violations.push({
        from: "tools/check/client-dependency-matrix.json",
        to: [...path, owner].join(" -> "),
        reason: "Client dependency matrix contains a cycle"
      });
      return;
    }
    if (visited.has(owner)) return;
    visiting.add(owner);
    for (const target of matrix[owner] ?? []) {
      if (!owners.has(target)) {
        violations.push({
          from: `client/${owner}`,
          to: `client/${target}`,
          reason: "Unknown client dependency matrix owner"
        });
        continue;
      }
      visit(target, [...path, owner]);
    }
    visiting.delete(owner);
    visited.add(owner);
  }

  for (const owner of owners) visit(owner, []);
  for (const file of files) {
    const owner = clientOwner(file);
    if (owner && !owners.has(owner)) {
      violations.push({
        from: file,
        to: "tools/check/client-dependency-matrix.json",
        reason: "Client source has no dependency matrix owner"
      });
    }
  }
  for (const edge of edges) {
    const from = clientOwner(edge.from);
    if (!from) continue;
    if (edge.to.startsWith("apps/") && from !== "routes") {
      violations.push({
        ...edge,
        reason: "Only routes may consume app host assembly"
      });
    }
    const to = clientOwner(edge.to);
    if (!owners.has(from) || (to && !owners.has(to))) {
      violations.push({
        ...edge,
        reason: "Client source has no dependency matrix owner"
      });
    } else if (to && from !== to && !matrix[from].includes(to)) {
      violations.push({
        ...edge,
        reason: "Client dependency matrix disallows this import"
      });
    }
  }
  return violations;
}

/** Checks workspace manifest edges against the same client owner matrix. */
export function checkClientManifestMatrix(manifests, matrix) {
  const ownerByPackage = new Map(
    manifests.map(({ owner, manifest }) => [manifest.name, owner])
  );
  const violations = [];
  for (const { owner, manifest } of manifests) {
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.peerDependencies,
      ...manifest.devDependencies
    };
    for (const packageName of Object.keys(dependencies)) {
      const target = ownerByPackage.get(packageName);
      if (target && target !== owner && !matrix[owner]?.includes(target)) {
        violations.push({
          from: `client/${owner}/package.json`,
          to: `client/${target}/package.json`,
          reason: "Client dependency matrix disallows this workspace dependency"
        });
      }
    }
  }
  return violations;
}
