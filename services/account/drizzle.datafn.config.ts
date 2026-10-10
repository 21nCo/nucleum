import { defineConfig } from "drizzle-kit";
import {
  devMigrationRootCa,
  requireSecureRemotePostgresUrl
} from "./src/db/postgres-security.js";

const databaseUrl = process.env.DATAFN_DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATAFN_DATABASE_URL is required for DataFn migrations");
}

const rootCa = devMigrationRootCa(process.env);
if (!rootCa) {
  requireSecureRemotePostgresUrl(databaseUrl);
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/generated/datafn/datafn-schema.drizzle.ts",
  out: "./drizzle/datafn",
  dbCredentials: rootCa
    ? pinnedCaCredentials(databaseUrl, rootCa)
    : { url: databaseUrl }
});

/**
 * Builds dev connection credentials that verify the server chain against the
 * pinned root CA and skip only the hostname check. Rejects query parameters
 * other than `sslmode`, which these credentials cannot carry.
 */
function pinnedCaCredentials(value: string, ca: string) {
  const url = new URL(value);
  const unsupported = [...url.searchParams.keys()].filter(
    (key) => key !== "sslmode"
  );
  if (unsupported.length > 0) {
    throw new Error(
      `Dev DataFn migration URLs support only sslmode; remove: ${unsupported.join(", ")}`
    );
  }
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: { ca, checkServerIdentity: () => undefined }
  };
}
