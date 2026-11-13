import { defineConfig } from "drizzle-kit";
import datafnConfig from "./drizzle.datafn.config";

/**
 * FileFn tables live in the regional DataFn Postgres, so FileFn migrations use
 * the DataFn connection and its TLS rules (`DATAFN_DATABASE_URL`). They keep a
 * separate journal table: drizzle skips any migration older than the newest
 * journal row, so a shared journal would let one history hide the other's.
 */
export default defineConfig({
  ...datafnConfig,
  schema: "./src/db/generated/filefn/filefn-schema.ts",
  out: "./drizzle/filefn",
  migrations: { schema: "drizzle", table: "__drizzle_migrations_filefn" }
});
