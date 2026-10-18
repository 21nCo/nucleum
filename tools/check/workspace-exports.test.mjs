import assert from "node:assert/strict";
import test from "node:test";
import { checkWorkspaceExports, resolveExport } from "./workspace-exports.mjs";

test("filesystem aliases cannot bypass missing package exports", () => {
  const packages = [
    {
      name: "@example/state",
      directory: "client/state",
      exports: { "./public/*": "./public/*" }
    }
  ];
  const imports = [
    { from: "client/shell/page.ts", specifier: "@example/state/private/host" }
  ];
  assert.equal(checkWorkspaceExports(imports, packages).length, 1);
  packages[0].exports["./private/*"] = "./private/*";
  assert.deepEqual(checkWorkspaceExports(imports, packages), []);
});

test("specific exclusions win over wildcard exports", () => {
  assert.equal(
    resolveExport({ "./*": "./*", "./private/*": null }, "./private/secret"),
    null
  );
  assert.equal(
    resolveExport({ "./*.js": "./*.ts" }, "./store.js"),
    "./store.ts"
  );
});

test("an exported key cannot point somewhere different from its source alias", () => {
  const packages = [
    {
      name: "@example/state",
      directory: "client/state",
      exports: { "./host": "./wrong.ts" }
    }
  ];
  const imports = [
    {
      from: "client/shell/page.ts",
      specifier: "@example/state/host",
      targets: ["client/state/host.ts"]
    }
  ];
  assert.match(
    checkWorkspaceExports(imports, packages)[0].reason,
    /target disagrees/
  );
  packages[0].exports["./host"] = "./host.ts";
  assert.deepEqual(checkWorkspaceExports(imports, packages), []);
});
