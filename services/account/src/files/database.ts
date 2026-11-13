import { drizzleAdapter } from "@superfunctions/db/adapters/drizzle";
import type { Adapter } from "@superfunctions/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as filefnSchema from "../db/generated/filefn/filefn-schema.js";
import { requireSecureRemotePostgresUrl } from "../db/postgres-security.js";
import type { AccountWorkerEnv } from "../worker-env.js";

/** FileFn database handle over the regional DataFn Postgres. */
export interface AccountFileDatabase {
  adapter: Adapter;
  close(): Promise<void>;
}

/**
 * Opens the FileFn tables from the Node runtime. They live in the regional
 * DataFn Postgres (`DATAFN_DATABASE_URL`) beside the sync tables.
 */
export function createNodeFileDatabase(
  databaseUrl = process.env.DATAFN_DATABASE_URL
): AccountFileDatabase {
  if (!databaseUrl) {
    throw new Error("DATAFN_DATABASE_URL is required for services/account files");
  }
  requireSecureRemotePostgresUrl(databaseUrl);
  return openFileDatabase(
    postgres(databaseUrl, {
      max: Number(process.env.FILEFN_DB_POOL_SIZE ?? 2)
    })
  );
}

/**
 * Opens the FileFn tables from a Worker through the `SYNC_DB` Hyperdrive
 * binding, or `DATAFN_DATABASE_URL` when no binding is present.
 */
export function createCloudflareFileDatabase(
  env: AccountWorkerEnv
): AccountFileDatabase {
  const hyperdriveConnectionString = env.SYNC_DB?.connectionString;
  const connectionString = hyperdriveConnectionString ?? env.DATAFN_DATABASE_URL;
  if (!connectionString) {
    throw new Error("SYNC_DB Hyperdrive binding or DATAFN_DATABASE_URL is required");
  }
  if (hyperdriveConnectionString === undefined) {
    requireSecureRemotePostgresUrl(connectionString);
  }
  return openFileDatabase(
    postgres(connectionString, {
      max: 1,
      prepare: false
    })
  );
}

function openFileDatabase(sql: postgres.Sql): AccountFileDatabase {
  return {
    adapter: drizzleAdapter({
      db: drizzle(sql, { schema: filefnSchema }),
      dialect: "postgres"
    }),
    close: async () => {
      await sql.end({ timeout: 1 });
    }
  };
}
