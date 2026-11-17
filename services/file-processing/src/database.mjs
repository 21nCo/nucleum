import { drizzleAdapter } from '@superfunctions/db/adapters/drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// The account service's generated FileFn schema, copied in by the Dockerfile.
import * as schema from './filefn-schema.mjs';

/**
 * `FILEFN_DATABASE` module of the processing container: the FileFn tables in
 * the region's account Postgres (`FILEFN_DATABASE_URL`), through the same
 * generated Drizzle schema the account service uses. `close()` ends the pool.
 */
export default function createDatabase(env) {
  const url = env.FILEFN_DATABASE_URL?.trim();
  if (!url) {
    throw new Error('FILEFN_CONTAINER_CONFIG_INVALID: FILEFN_DATABASE_URL is required');
  }
  const sql = postgres(url, { max: Number(env.FILEFN_DB_POOL_SIZE ?? 4) });
  const adapter = drizzleAdapter({ db: drizzle(sql, { schema }), dialect: 'postgres' });
  adapter.close = async () => {
    await sql.end({ timeout: 5 });
  };
  return adapter;
}
