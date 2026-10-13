import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const matrix = JSON.parse(
  fs.readFileSync(
    path.join(root, "tools/check/client-dependency-matrix.json"),
    "utf8"
  )
);
const document = fs.readFileSync(
  path.join(root, "docs/architecture/client-dependency-map.md"),
  "utf8"
);
const table =
  document.split("## Direct imports")[1]?.split("Inside `client/ui`")[0] ?? "";
const rows = new Map(
  [...table.matchAll(/^\| `([^`]+)` \| (.+) \|$/gm)].map(
    ([, owner, targets]) => [
      owner,
      [...targets.matchAll(/`([^`]+)`/g)].map((match) => match[1])
    ]
  )
);
const expected = Object.entries(matrix).filter(([, targets]) => targets.length);
const failures = expected.filter(
  ([owner, targets]) =>
    JSON.stringify(rows.get(owner)) !== JSON.stringify(targets)
);
for (const owner of rows.keys())
  if (!matrix[owner]?.length) failures.push([owner]);
for (const [owner] of failures)
  console.error(`Dependency documentation differs from matrix: ${owner}`);
console.log(
  `Dependency documentation: ${expected.length} importing owners, ${failures.length} mismatches.`
);
process.exitCode = failures.length ? 1 : 0;
