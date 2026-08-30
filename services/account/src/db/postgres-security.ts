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
  if (LOOPBACK_HOSTS.has(url.hostname)) {
    return;
  }

  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
  const sslRootCert = url.searchParams.get("sslrootcert")?.toLowerCase();
  if (sslMode !== "verify-full" && sslRootCert !== "system") {
    throw new Error(
      "Remote Postgres connection string must use sslmode=verify-full or sslrootcert=system"
    );
  }
}
