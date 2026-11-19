import { drizzleAdapter } from '@superfunctions/db/adapters/drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { isVerifiedPostgresTarget, requireVerifiedPostgresUrl } from './postgres-url.mjs';

export { requireVerifiedPostgresUrl };

/**
 * Opens the FileFn tables at `FILEFN_DATABASE_URL` with `schema`. The URL is
 * checked before the client is built, and the options postgres.js actually
 * parsed (host list and `ssl`) are checked again before the client is used;
 * postgres.js connects lazily, so nothing connects unless both checks pass.
 */
export function openFileFnDatabase(env, schema) {
  const url = env.FILEFN_DATABASE_URL?.trim();
  if (!url) {
    throw new Error('FILEFN_CONTAINER_CONFIG_INVALID: FILEFN_DATABASE_URL is required');
  }
  requireVerifiedPostgresUrl(url);
  const sql = postgres(url, { max: Number(env.FILEFN_DB_POOL_SIZE ?? 4) });
  if (!isVerifiedPostgresTarget({ hosts: sql.options.host, ssl: sql.options.ssl })) {
    void sql.end({ timeout: 0 }).catch(() => {});
    throw new Error(
      'FILEFN_CONTAINER_CONFIG_INVALID: postgres.js would connect to a non-loopback FILEFN_DATABASE_URL host without ssl=verify-full'
    );
  }
  const adapter = drizzleAdapter({ db: drizzle(sql, { schema }), dialect: 'postgres' });
  adapter.close = async () => {
    await sql.end({ timeout: 5 });
  };
  return adapter;
}
