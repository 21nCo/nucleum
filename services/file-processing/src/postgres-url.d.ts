/** Target hosts and TLS mode postgres.js 3.4 derives from a connection URL. */
export interface PostgresUrlTarget {
  protocol: string;
  hosts: string[];
  ssl: string | false;
  searchParams: URLSearchParams;
}

/** Parses `value` the way postgres.js parseUrl/parseOptions does (URL only, no PG* env). */
export declare function postgresUrlTarget(value: string): PostgresUrlTarget;

/** True when `ssl` is `verify-full` or every host is loopback. */
export declare function isVerifiedPostgresTarget(target: { hosts: readonly string[]; ssl: unknown }): boolean;

/**
 * Throws unless postgres.js would connect to the URL with certificate-verifying
 * TLS (exact lowercase `sslmode=verify-full`, `ssl=verify-full` or
 * `sslrootcert=system`), or every host it
 * would connect to is loopback.
 */
export declare function requireVerifiedPostgresUrl(value: string): void;
