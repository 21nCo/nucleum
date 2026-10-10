const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Requires remote Postgres connections to verify the database server certificate. */
export function requireSecureRemotePostgresUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Postgres connection string must be a valid URL");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(
      "Postgres connection string must use the postgres protocol"
    );
  }

  const sslModes = url.searchParams.getAll("sslmode");
  const sslRootCerts = url.searchParams.getAll("sslrootcert");
  if (sslModes.length > 1 || sslRootCerts.length > 1) {
    throw new Error(
      "Postgres connection string must not repeat TLS parameters"
    );
  }
  if (LOOPBACK_HOSTS.has(url.hostname)) {
    return;
  }

  const sslMode = sslModes[0]?.toLowerCase();
  const sslRootCert = sslRootCerts[0]?.toLowerCase();
  if (sslMode !== "verify-full" && sslRootCert !== "system") {
    throw new Error(
      "Remote Postgres connection string must use sslmode=verify-full or sslrootcert=system"
    );
  }
}

/**
 * Returns true only for dev DataFn migrations that explicitly opt in to
 * unverified TLS. The dev Railway databases present a self-signed
 * certificate for `localhost`, so they can never pass `verify-full`.
 * Every other environment keeps the strict check above.
 */
export function allowsUnverifiedDevMigrationTls(
  env: Record<string, string | undefined>
): boolean {
  return (
    env.DATAFN_DEPLOY_ENVIRONMENT === "dev" &&
    env.DATAFN_ALLOW_UNVERIFIED_TLS === "1"
  );
}
