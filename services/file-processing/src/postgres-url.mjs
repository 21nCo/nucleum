// postgres.js cuts every host entry at its first `:`, so a bracketed IPv6
// literal such as [::1] never reaches it intact and is not treated as loopback.
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

const INVALID = 'FILEFN_CONTAINER_CONFIG_INVALID';

/**
 * The target hosts and TLS mode postgres.js 3.4 derives from a connection
 * URL, computed with the same steps as its parseUrl/parseOptions: the host
 * list is the authority after the FIRST `@` (not the last, as WHATWG URL
 * splits userinfo), percent-decoded and split on commas, each entry cut at
 * `:`; query parameters come from the URL with that list replaced by its
 * first entry, the last value of a repeated name wins, `sslmode` becomes
 * `ssl`, and the exact lowercase `sslrootcert=system` forces `verify-full`.
 * Only the URL is considered, never PG* environment fallbacks.
 */
export function postgresUrlTarget(value) {
  let authority = value.slice(value.indexOf('://') + 3).split(/[?/]/)[0];
  authority = decodeURIComponent(authority.slice(authority.indexOf('@') + 1));
  const url = new URL(value.replace(authority, authority.split(',')[0]));
  const query = {};
  for (const [name, entry] of url.searchParams) query[name] = entry;
  if (query.sslmode) query.ssl = query.sslmode;
  if (query.sslrootcert === 'system') query.ssl = 'verify-full';
  const hostList = authority.includes(',') ? authority : url.hostname;
  return {
    protocol: url.protocol,
    hosts: hostList.split(',').map((entry) => entry.split(':')[0]),
    ssl: query.ssl ?? false,
    searchParams: url.searchParams
  };
}

/**
 * Whether postgres.js options (or a postgresUrlTarget) satisfy the
 * container's rule: certificate-verifying TLS, or only loopback hosts.
 */
export function isVerifiedPostgresTarget({ hosts, ssl }) {
  if (ssl === 'verify-full') return true;
  return hosts.length > 0 && hosts.every((host) => LOOPBACK_HOSTS.has(host));
}

/**
 * The processing container's Postgres TLS rule, decided on the host list and
 * TLS mode postgres.js itself derives (postgresUrlTarget): every host must be
 * loopback, or postgres.js must connect with `ssl=verify-full`, which it does
 * only for the exact lowercase `sslmode=verify-full` or `sslrootcert=system`.
 * Plaintext, `sslmode=require` (no certificate check), other spellings and
 * repeated TLS parameters are refused. The container also checks the options
 * of the client it builds (openFileFnDatabase). Worker-safe: no imports.
 */
export function requireVerifiedPostgresUrl(value) {
  let target;
  try {
    target = postgresUrlTarget(value);
  } catch {
    throw new Error(`${INVALID}: FILEFN_DATABASE_URL must be a valid URL`);
  }
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) {
    throw new Error(`${INVALID}: FILEFN_DATABASE_URL must use the postgres protocol`);
  }
  for (const name of ['sslmode', 'sslrootcert', 'ssl']) {
    if (target.searchParams.getAll(name).length > 1) {
      throw new Error(`${INVALID}: FILEFN_DATABASE_URL must not repeat TLS parameters`);
    }
  }
  if (!isVerifiedPostgresTarget(target)) {
    throw new Error(
      `${INVALID}: a remote FILEFN_DATABASE_URL must use sslmode=verify-full or sslrootcert=system (exact lowercase values), unless every host is loopback`
    );
  }
}
