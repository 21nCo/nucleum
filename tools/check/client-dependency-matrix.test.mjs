import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  checkClientDependencyMatrix,
  checkClientManifestMatrix
} from "./client-dependency-matrix.mjs";

const matrix = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("./client-dependency-matrix.json", import.meta.url)),
    "utf8"
  )
);

test("the client matrix is acyclic and accepts its declared direction", () => {
  assert.deepEqual(
    checkClientDependencyMatrix(
      [
        {
          from: "client/composition/configure-hosts.ts",
          to: "client/products/product.config.ts",
          typeOnly: false
        }
      ],
      matrix
    ),
    []
  );
});

test("the client matrix rejects reverse edges including type-only imports", () => {
  const violations = checkClientDependencyMatrix(
    [
      {
        from: "client/products/product.config.ts",
        to: "client/composition/configure-hosts.ts",
        typeOnly: true
      }
    ],
    matrix
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /disallows/);
});

test("the client matrix rejects a cycle in its allowed edges", () => {
  const cyclic = { ...matrix, config: ["next", "composition"] };
  const violations = checkClientDependencyMatrix([], cyclic);
  assert.ok(violations.some((entry) => /cycle/.test(entry.reason)));
});

test("workspace manifests cannot declare a reverse dependency", () => {
  const violations = checkClientManifestMatrix(
    [
      {
        owner: "products",
        manifest: {
          name: "@nucleum/products",
          peerDependencies: { "@nucleum/composition": "*" }
        }
      },
      { owner: "composition", manifest: { name: "@nucleum/composition" } }
    ],
    matrix
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /workspace dependency/);
});

test("an unlisted client owner is rejected even without imports", () => {
  const violations = checkClientDependencyMatrix(
    [],
    matrix,
    ["client/unknown/new-file.ts"]
  );
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /no dependency matrix owner/);
});
