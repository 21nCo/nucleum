import { drizzleAdapter } from '@superfunctions/db/adapters/drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { requireVerifiedPostgresUrl } from './postgres-url.mjs';

export { requireVerifiedPostgresUrl };

/**
 * Opens the FileFn tables at `FILEFN_DATABASE_URL` with `schema`, after
 * checking its TLS settings; nothing connects before the check passes.
 */
export function openFileFnDatabase(env, schema) {
  const url = env.FILEFN_DATABASE_URL?.trim();
  if (!url) {
    throw new Error('FILEFN_CONTAINER_CONFIG_INVALID: FILEFN_DATABASE_URL is required');
  }
  requireVerifiedPostgresUrl(url);
  const sql = postgres(url, { max: Number(env.FILEFN_DB_POOL_SIZE ?? 4) });
  const adapter = drizzleAdapter({ db: drizzle(sql, { schema }), dialect: 'postgres' });
  adapter.close = async () => {
    await sql.end({ timeout: 5 });
  };
  return adapter;
}
