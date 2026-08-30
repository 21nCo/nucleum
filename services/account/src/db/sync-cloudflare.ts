import { drizzleAdapter } from "@superfunctions/db/adapters/drizzle";
import type { Adapter } from "@superfunctions/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as datafnSchema from "./generated/datafn/datafn-schema.drizzle.js";
import type { AccountWorkerEnv } from "./cloudflare.js";
import { requireSecureRemotePostgresUrl } from "./postgres-security.js";

interface CloudflareDatafnSyncDatabase {
  adapter: Adapter;
  close(): Promise<void>;
}

export function createCloudflareSyncDatabase(
  env: AccountWorkerEnv
): CloudflareDatafnSyncDatabase {
  const hyperdriveConnectionString = env.SYNC_DB?.connectionString;
  const connectionString =
    hyperdriveConnectionString ?? env.DATAFN_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "SYNC_DB Hyperdrive binding or DATAFN_DATABASE_URL is required"
    );
  }
  if (hyperdriveConnectionString === undefined) {
    requireSecureRemotePostgresUrl(connectionString);
  }

  const sql = postgres(connectionString, {
    max: 1,
    prepare: false
  });
  const db = drizzle(sql, {
    schema: datafnSchema
  });

  return {
    adapter: drizzleAdapter({
      db,
      dialect: "postgres"
    }),
    close: async () => {
      await sql.end({
        timeout: 1
      });
    }
  };
}
