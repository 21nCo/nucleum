import { drizzleAdapter } from '@superfunctions/db/adapters/drizzle';
import type { Adapter } from '@superfunctions/db';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as authSchema from './generated/authfn-schema.js';
import type { AccountWorkerEnv } from '../worker-env.js';

export function createCloudflareDatabase(env: AccountWorkerEnv): { adapter: Adapter; close(): Promise<void> } {
  const connectionString = env.ACCOUNT_DB?.connectionString ?? env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('ACCOUNT_DB Hyperdrive binding or DATABASE_URL is required');
  }

  const sql = postgres(connectionString, {
    max: 1,
    prepare: false
  });
  const db = drizzle(sql, {
    schema: authSchema
  });

  return {
    adapter: drizzleAdapter({
      db,
      dialect: 'postgres'
    }),
    close: async () => {
      await sql.end({
        timeout: 1
      });
    }
  };
}
