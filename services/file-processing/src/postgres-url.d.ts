/**
 * Throws unless `value` is a postgres URL that postgres.js connects to with
 * certificate-verifying TLS (exact `sslmode=verify-full` or
 * `sslrootcert=system`), or a loopback host.
 */
export declare function requireVerifiedPostgresUrl(value: string): void;
