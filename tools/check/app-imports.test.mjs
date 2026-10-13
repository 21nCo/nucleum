import assert from "node:assert/strict";
import test from "node:test";
import {
  readAppAliases,
  resolveAppImport,
  checkAppAssemblyImport
} from "./app-imports.mjs";

const hosts = ["one", "two"].map((name) =>
  readAppAliases(
    `apps/${name}/svelte.config.js`,
    `export default { kit: { alias: { $local: "./src", $lib: "../../" }, files: { routes: "../../client/routes" } } };`
  )
);

test("shared assembly resolves through each configured product host", () => {
  assert.deepEqual(
    resolveAppImport("$local/local", "client/routes/+layout.svelte", hosts)
      .targets,
    ["apps/one/src/local", "apps/two/src/local"]
  );
  assert.equal(
    checkAppAssemblyImport(
      "client/products/product.resolver.ts",
      "$local/local"
    ).length,
    1
  );
  assert.deepEqual(
    checkAppAssemblyImport("client/routes/+layout.svelte", "$local/local"),
    []
  );
});

test("app aliases use the importing host and shared lib targets are deduplicated", () => {
  assert.deepEqual(
    resolveAppImport("$local/local", "apps/two/src/page.ts", hosts).targets,
    ["apps/two/src/local"]
  );
  assert.deepEqual(
    resolveAppImport(
      "$lib/client/config/product.type",
      "client/routes/page.ts",
      hosts
    ).targets,
    ["client/config/product.type"]
  );
});

test("framework modules and unknown aliases have distinct results", () => {
  assert.equal(
    resolveAppImport("$app/stores", "client/routes/page.ts", hosts).framework,
    true
  );
  assert.deepEqual(
    resolveAppImport("$unknown/module", "client/routes/page.ts", hosts),
    { framework: false, targets: [] }
  );
});
