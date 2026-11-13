import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { accessSync, constants, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSchema } from "@filefn/server";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { schema as datafnSchema } from "../db/generated/datafn/datafn-schema.drizzle";
import * as filefnTables from "../db/generated/filefn/filefn-schema";

/**
 * Verifies the FileFn schema and migration history against `@filefn/server`
 * `getSchema()`: the checked-in Drizzle schema is what the generator produces
 * today, and the `filefn:migrate` and `datafn:migrate` scripts build every
 * FileFn table, column, index and constraint in one disposable database,
 * whichever history is applied first.
 */
const serviceDir = fileURLToPath(new URL("../..", import.meta.url));
const generatedFile = "src/db/generated/filefn/filefn-schema.ts";
const filefnSchema = getSchema({ namespace: "filefn" });
const filefnMigrations = readMigrationFiles({ migrationsFolder: path.join(serviceDir, "drizzle/filefn") });
const datafnMigrations = readMigrationFiles({ migrationsFolder: path.join(serviceDir, "drizzle/datafn") });

function run(command: string, args: string[], options: SpawnSyncOptions = {}): string {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout || result.error?.message}`);
  return String(result.stdout).trim();
}

function physicalName(modelName: string) {
  return `filefn_${modelName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`;
}

const pgType = { string: "text", number: "integer", boolean: "boolean", json: "json" } as const;

/** Rows `table|...` that the database must contain exactly, derived from `getSchema()`. */
const expected = { columns: new Set<string>(), unique: new Set<string>(), indexes: new Set<string>() };
for (const table of filefnSchema.schemas) {
  const name = physicalName(table.modelName);
  for (const [field, definition] of Object.entries(table.fields)) {
    const type = pgType[definition.type as keyof typeof pgType];
    assert(type, `${name}.${field} has an unmapped FileFn type ${definition.type}`);
    expected.columns.add(`${name}|${field}|${type}|${definition.required ? "NO" : "YES"}`);
    if (definition.unique) expected.unique.add(`${name}|${field}`);
  }
  for (const index of table.indexes ?? [])
    expected.indexes.add(`${name}|${index.name}|${index.unique ? "unique" : "plain"}|${index.fields.join(",")}`);
  for (const constraint of table.constraints ?? []) {
    assert.equal(constraint.type, "unique", `${constraint.name} is not a unique constraint`);
    expected.unique.add(`${name}|${constraint.fields.join(",")}|${constraint.name}`);
  }
}

// The checked-in generated schema is the generator's current output and maps every FileFn table.
const output = mkdtempSync(path.join(tmpdir(), "filefn-schema-"));
try {
  run("npx", ["superfunctions", "generate-schema", "--config", "./superfunctions.config.mjs", "--library", "filefn",
    "--adapter", "drizzle", "--output", output, "--force"], { cwd: serviceDir });
  assert.equal(
    readFileSync(path.join(output, "filefn-schema.ts"), "utf8"),
    readFileSync(path.join(serviceDir, generatedFile), "utf8"),
    `${generatedFile} is stale; run npm run filefn:generate`
  );
} finally {
  rmSync(output, { recursive: true, force: true });
}
const generatedTables = Object.values(filefnTables).map((table) => getTableConfig(table as PgTable));
assert.deepEqual(
  generatedTables.map((table) => table.name).sort(),
  filefnSchema.schemas.map((table) => physicalName(table.modelName)).sort(),
  "Generated FileFn tables do not match getSchema()"
);

const docker = [
  "/usr/bin/docker",
  "/usr/local/bin/docker",
  "/opt/homebrew/bin/docker",
  "/Applications/Docker.app/Contents/Resources/bin/docker",
  "C:/Program Files/Docker/Docker/resources/bin/docker.exe"
].find((candidate) => {
  try {
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
});
assert(docker, "Install Docker in a standard system location");

const password = "filefn-migration-fixture";
// Publishes only on loopback with an ephemeral host port, for the drizzle-kit scripts.
const container = run(docker, ["run", "--rm", "-d", "-p", "127.0.0.1::5432", "-e", `POSTGRES_PASSWORD=${password}`, "postgres:17-alpine"]);

try {
  const port = run(docker, ["port", container, "5432/tcp"]).split("\n")[0].split(":").pop();
  let ready = false;
  for (let attempt = 0; attempt < 120 && !ready; attempt++) {
    ready = spawnSync(docker, ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], { stdio: "ignore" }).status === 0;
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, "Disposable PostgreSQL did not become ready");

  for (const [database, order] of [
    ["filefn_first", ["filefn:migrate", "datafn:migrate"]],
    ["datafn_first", ["datafn:migrate", "filefn:migrate"]]
  ] as const) {
    run(docker, ["exec", container, "createdb", "-U", "postgres", database]);
    const sql = (input: string): string =>
      run(docker, ["exec", "-i", container, "psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-At"], { input });
    const rows = (input: string): Set<string> => new Set(sql(input).split("\n").filter(Boolean));
    const env: NodeJS.ProcessEnv = { ...process.env, DATAFN_DATABASE_URL: `postgres://postgres:${password}@127.0.0.1:${port}/${database}` };
    delete env.DATAFN_DEPLOY_ENVIRONMENT;
    const migrate = (script: string) => run("npm", ["run", "--silent", script], { cwd: serviceDir, env });

    for (const script of order) migrate(script);
    const datafnTables = rows("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    for (const table of Object.values(datafnSchema))
      assert(datafnTables.has(getTableConfig(table).name), `${database}: DataFn table ${getTableConfig(table).name} is missing`);

    // Each history keeps its own journal, so applying them in either order, or again, applies every migration once.
    for (const script of order) migrate(script);
    assert.equal(sql("SELECT count(*) FROM drizzle.__drizzle_migrations_filefn"), String(filefnMigrations.length));
    assert.equal(sql("SELECT count(*) FROM drizzle.__drizzle_migrations"), String(datafnMigrations.length));

    assert.deepEqual(
      rows(`SELECT table_name || '|' || column_name || '|' || data_type || '|' || is_nullable
        FROM information_schema.columns WHERE table_schema = 'public' AND table_name LIKE 'filefn\\_%'`),
      expected.columns,
      `${database}: FileFn columns do not match getSchema()`
    );
    // Field-level unique constraints carry Drizzle's names; getSchema() constraints keep their declared names.
    assert.deepEqual(
      rows(`SELECT t.relname || '|' || string_agg(a.attname, ',' ORDER BY k.ord)
          || CASE WHEN count(*) > 1 THEN '|' || c.conname ELSE '' END
        FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
        CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE c.contype = 'u' AND t.relname LIKE 'filefn\\_%' GROUP BY t.relname, c.conname`),
      expected.unique,
      `${database}: FileFn unique constraints do not match getSchema()`
    );
    assert.deepEqual(
      rows(`SELECT t.relname || '|' || i.relname || '|' || CASE WHEN x.indisunique THEN 'unique' ELSE 'plain' END
          || '|' || string_agg(a.attname, ',' ORDER BY k.ord)
        FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid JOIN pg_class t ON t.oid = x.indrelid
        CROSS JOIN LATERAL unnest(x.indkey) WITH ORDINALITY k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE t.relname LIKE 'filefn\\_%' AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid)
        GROUP BY t.relname, i.relname, x.indisunique`),
      expected.indexes,
      `${database}: FileFn indexes do not match getSchema()`
    );

    const part = `INSERT INTO filefn_upload_parts ("uploadSessionId", "partNumber", etag, size) VALUES ('session', 1, 'etag', 1);`;
    sql(part);
    assert.throws(() => sql(part), /filefn_parts_unique/, `${database}: a repeated upload part was stored twice`);

    console.log(
      `${database}: ${order.join(" then ")}, ${filefnMigrations.length} FileFn and ${datafnMigrations.length} DataFn migrations, ` +
        `${expected.columns.size} columns, ${expected.unique.size} unique constraints and ${expected.indexes.size} indexes match getSchema()`
    );
  }
} finally {
  run(docker, ["rm", "-f", container]);
}
