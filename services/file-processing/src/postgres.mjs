import { drizzleAdapter } from '@superfunctions/db/adapters/drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The account service's Postgres TLS rule
 * (`services/account/src/db/postgres-security.ts`): a connection to any host
 * but loopback must verify the server certificate, through
 * `sslmode=verify-full` or `sslrootcert=system`. postgres.js sends plaintext
 * without `sslmode` and skips certificate checks with `sslmode=require`.
 */
export function requireSecureRemotePostgresUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('FILEFN_CONTAINER_CONFIG_INVALID: FILEFN_DATABASE_URL must be a valid URL');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('FILEFN_CONTAINER_CONFIG_INVALID: FILEFN_DATABASE_URL must use the postgres protocol');
  }
  const sslModes = url.searchParams.getAll('sslmode');
  const sslRootCerts = url.searchParams.getAll('sslrootcert');
  if (sslModes.length > 1 || sslRootCerts.length > 1) {
    throw new Error('FILEFN_CONTAINER_CONFIG_INVALID: FILEFN_DATABASE_URL must not repeat TLS parameters');
  }
  if (LOOPBACK_HOSTS.has(url.hostname)) {
    return;
  }
  if (sslModes[0]?.toLowerCase() !== 'verify-full' && sslRootCerts[0]?.toLowerCase() !== 'system') {
    throw new Error(
      'FILEFN_CONTAINER_CONFIG_INVALID: a remote FILEFN_DATABASE_URL must use sslmode=verify-full or sslrootcert=system'
    );
  }
}

/**
 * Opens the FileFn tables at `FILEFN_DATABASE_URL` with `schema`, after
 * checking its TLS settings; nothing connects before the check passes.
 */
export function openFileFnDatabase(env, schema) {
  const url = env.FILEFN_DATABASE_URL?.trim();
  if (!url) {
    throw new Error('FILEFN_CONTAINER_CONFIG_INVALID: FILEFN_DATABASE_URL is required');
  }
  requireSecureRemotePostgresUrl(url);
  const sql = postgres(url, { max: Number(env.FILEFN_DB_POOL_SIZE ?? 4) });
  const adapter = drizzleAdapter({ db: drizzle(sql, { schema }), dialect: 'postgres' });
  adapter.close = async () => {
    await sql.end({ timeout: 5 });
  };
  return adapter;
}
