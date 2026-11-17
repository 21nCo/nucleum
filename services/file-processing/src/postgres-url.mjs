const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const INVALID = 'FILEFN_CONTAINER_CONFIG_INVALID';

/**
 * The processing container's Postgres TLS rule, matched to how postgres.js
 * reads the URL: a connection to any host but loopback must verify the
 * server certificate. postgres.js verifies only for the exact, lowercase
 * `sslrootcert=system` (which it turns into `ssl=verify-full`, overriding
 * `sslmode`) or `sslmode=verify-full`; it sends plaintext without `sslmode`
 * (or with `sslrootcert=SYSTEM`) and skips the certificate check with
 * `sslmode=require`. Any other spelling is refused, so a URL this accepts
 * always connects with certificate-verifying TLS. Worker-safe: no imports.
 */
export function requireVerifiedPostgresUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${INVALID}: FILEFN_DATABASE_URL must be a valid URL`);
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(`${INVALID}: FILEFN_DATABASE_URL must use the postgres protocol`);
  }
  const sslModes = url.searchParams.getAll('sslmode');
  const sslRootCerts = url.searchParams.getAll('sslrootcert');
  if (sslModes.length > 1 || sslRootCerts.length > 1) {
    throw new Error(`${INVALID}: FILEFN_DATABASE_URL must not repeat TLS parameters`);
  }
  if (LOOPBACK_HOSTS.has(url.hostname)) {
    return;
  }
  if (sslModes[0] !== 'verify-full' && sslRootCerts[0] !== 'system') {
    throw new Error(
      `${INVALID}: a remote FILEFN_DATABASE_URL must use sslmode=verify-full or sslrootcert=system (exact lowercase values)`
    );
  }
}
