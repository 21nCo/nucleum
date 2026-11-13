import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { randomBytes } from "node:crypto";
import { accessSync, constants, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { getSchema } from "@filefn/server";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { schema as datafnSchema } from "../db/generated/datafn/datafn-schema.drizzle";
import * as filefnTables from "../db/generated/filefn/filefn-schema";

/**
 * Verifies the FileFn schema and migration history against `@filefn/server`
 * `getSchema()`: the checked-in Drizzle schema is what the generator produces
 * today and maps every FileFn table, and the `filefn:migrate` and
 * `datafn:migrate` scripts build every FileFn table, column, index and
 * constraint in two databases of one disposable PostgreSQL container, one per
 * application order. The container publishes only on loopback with an
 * ephemeral host port and a per-run random password. Each history keeps its
 * own journal, so applying them in either order, or again, applies every
 * migration once. Field-level unique constraints carry Drizzle's names, and
 * `getSchema()` constraints keep their declared names.
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
  return `filefn_${modelName.replace(/[A-Z]/g, "_$&").toLowerCase()}`;
}

/** Whether `candidate` is an executable regular file. */
function isExecutable(candidate: string): boolean {
  try {
    accessSync(candidate, constants.X_OK);
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolves the Docker CLI to an absolute path: each `PATH` entry in order,
 * with relative and empty entries resolved against the working directory as
 * the shell does, then the standard install locations.
 */
function findDocker(): string | undefined {
  const executable = process.platform === "win32" ? "docker.exe" : "docker";
  return [
    ...(process.env.PATH ?? "").split(path.delimiter).map((directory) => path.resolve(directory, executable)),
    "/usr/bin/docker",
    "/usr/local/bin/docker",
    "/opt/homebrew/bin/docker",
    "/Applications/Docker.app/Contents/Resources/bin/docker",
    "C:/Program Files/Docker/Docker/resources/bin/docker.exe"
  ].find(isExecutable);
}

/** Polls `isReady` up to `attempts` more times, 250 ms apart, one probe at a time. */
async function waitUntil(isReady: () => boolean, attempts: number): Promise<boolean> {
  if (isReady()) return true;
  if (attempts <= 0) return false;
  await delay(250);
  return waitUntil(isReady, attempts - 1);
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
  generatedTables.map((table) => table.name).sort((a, b) => a.localeCompare(b)),
  filefnSchema.schemas.map((table) => physicalName(table.modelName)).sort((a, b) => a.localeCompare(b)),
  "Generated FileFn tables do not match getSchema()"
);

const docker = findDocker();
assert(docker, "Docker was not found on PATH or in a standard install location");

const password = randomBytes(18).toString("hex");
const container = run(docker, ["run", "--rm", "-d", "-p", "127.0.0.1::5432", "-e", `POSTGRES_PASSWORD=${password}`, "postgres:17-alpine"]);

try {
  const port = run(docker, ["port", container, "5432/tcp"]).split("\n")[0].split(":").pop();
  const ready = await waitUntil(
    () => spawnSync(docker, ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], { stdio: "ignore" }).status === 0,
    119
  );
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

    for (const script of order) migrate(script);
    assert.equal(sql("SELECT count(*) FROM drizzle.__drizzle_migrations_filefn"), String(filefnMigrations.length));
    assert.equal(sql("SELECT count(*) FROM drizzle.__drizzle_migrations"), String(datafnMigrations.length));

    assert.deepEqual(
      rows(String.raw`SELECT table_name || '|' || column_name || '|' || data_type || '|' || is_nullable
        FROM information_schema.columns WHERE table_schema = 'public' AND table_name LIKE 'filefn\_%'`),
      expected.columns,
      `${database}: FileFn columns do not match getSchema()`
    );
    assert.deepEqual(
      rows(String.raw`SELECT t.relname || '|' || string_agg(a.attname, ',' ORDER BY k.ord)
          || CASE WHEN count(*) > 1 THEN '|' || c.conname ELSE '' END
        FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
        CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE c.contype = 'u' AND t.relname LIKE 'filefn\_%' GROUP BY t.relname, c.conname`),
      expected.unique,
      `${database}: FileFn unique constraints do not match getSchema()`
    );
    assert.deepEqual(
      rows(String.raw`SELECT t.relname || '|' || i.relname || '|' || CASE WHEN x.indisunique THEN 'unique' ELSE 'plain' END
          || '|' || string_agg(a.attname, ',' ORDER BY k.ord)
        FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid JOIN pg_class t ON t.oid = x.indrelid
        CROSS JOIN LATERAL unnest(x.indkey) WITH ORDINALITY k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE t.relname LIKE 'filefn\_%' AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid)
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
