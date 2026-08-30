import { defineConfig } from "drizzle-kit";
import { requireSecureRemotePostgresUrl } from "./src/db/postgres-security.js";

const databaseUrl = process.env.DATAFN_DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATAFN_DATABASE_URL is required for DataFn migrations");
}
requireSecureRemotePostgresUrl(databaseUrl);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/generated/datafn/datafn-schema.drizzle.ts",
  out: "./drizzle/datafn",
  dbCredentials: {
    url: databaseUrl
  }
});
