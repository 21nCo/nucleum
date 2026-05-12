import { drizzleAdapter } from '@superfunctions/db/adapters/drizzle';
import type { Adapter } from '@superfunctions/db';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as authSchema from './generated/authfn-schema.js';
import { accountAuthSchema } from './schema.js';

export interface AccountDatabase {
  adapter: Adapter;
  close(): Promise<void>;
}

export function createNodeDatabase(databaseUrl = process.env.DATABASE_URL): AccountDatabase {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for services/account');
  }

  const sql = postgres(databaseUrl, {
    max: Number(process.env.ACCOUNT_DB_POOL_SIZE ?? 5)
  });
  const db = drizzle(sql, {
    schema: authSchema
  });
  const adapter = drizzleAdapter({
    db,
    dialect: 'postgres',
    adapterSchema: accountAuthSchema
  });

  return {
    adapter,
    close: async () => {
      await sql.end({
        timeout: 1
      });
    }
  };
}
