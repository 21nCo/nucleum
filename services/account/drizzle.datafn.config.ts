import { defineConfig } from "drizzle-kit";
import {
  allowsUnverifiedDevMigrationTls,
  requireSecureRemotePostgresUrl
} from "./src/db/postgres-security.js";

const databaseUrl = process.env.DATAFN_DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATAFN_DATABASE_URL is required for DataFn migrations");
}

const allowUnverifiedTls = allowsUnverifiedDevMigrationTls(process.env);
if (!allowUnverifiedTls) {
  requireSecureRemotePostgresUrl(databaseUrl);
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/generated/datafn/datafn-schema.drizzle.ts",
  out: "./drizzle/datafn",
  dbCredentials: allowUnverifiedTls
    ? unverifiedTlsCredentials(databaseUrl)
    : { url: databaseUrl }
});

/** Encrypts the dev connection without verifying the self-signed certificate. */
function unverifiedTlsCredentials(value: string) {
  const url = new URL(value);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: { rejectUnauthorized: false }
  };
}
