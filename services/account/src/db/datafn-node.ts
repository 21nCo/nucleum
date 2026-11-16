import { drizzleAdapter } from "@superfunctions/db/adapters/drizzle";
import type { Adapter } from "@superfunctions/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as syncSchema from "./sync-schema.js";
import { requireSecureRemotePostgresUrl } from "./postgres-security.js";

interface DatafnSyncDatabase {
  adapter: Adapter;
  close(): Promise<void>;
}

export function createNodeSyncDatabase(
  databaseUrl = process.env.DATAFN_DATABASE_URL
): DatafnSyncDatabase {
  if (!databaseUrl) {
    throw new Error(
      "DATAFN_DATABASE_URL is required for services/account sync"
    );
  }
  requireSecureRemotePostgresUrl(databaseUrl);

  const sql = postgres(databaseUrl, {
    max: Number(
      process.env.DATAFN_DB_POOL_SIZE ?? process.env.ACCOUNT_DB_POOL_SIZE ?? 5
    )
  });
  const db = drizzle(sql, {
    schema: syncSchema
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
