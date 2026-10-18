import type { Product } from "@nucleum/schema/product.type";
import { productRegistry } from "@nucleum/schema/product.config";
import {
  fallbackLegacyDatabaseName,
  openExistingIndexedDatabase
} from "./indexeddb-reader";
import {
  normalizeLegacySurrealIdentities,
  createLegacySurrealClient
} from "./surreal-reader";

/** Removes legacy Surreal databases for the supplied identities. */
export async function clearLegacySurrealLocalData(
  product: Product,
  identityValues: string[]
) {
  if (typeof indexedDB === "undefined") return;
  const databaseName =
    productRegistry[product]?.databaseName ?? fallbackLegacyDatabaseName;
  const database = await openExistingIndexedDatabase(databaseName).catch(
    () => null
  );
  if (!database) return;
  database.close();
  const identities = normalizeLegacySurrealIdentities(identityValues);
  if (!identities.length) return;
  const { surreal, escapeIdent } = await createLegacySurrealClient();
  try {
    await surreal.connect(`indxdb://${databaseName}`);
    await surreal.use({ namespace: "user", database: null });
    const statements = (await surreal.queryRaw(
      identities
        .map(
          (identity) => `REMOVE DATABASE IF EXISTS ${escapeIdent(identity)};`
        )
        .join("\n")
    )) as Array<{ status?: string; result?: unknown }>;
    const failed = statements.find((statement) => statement.status === "ERR");
    if (failed) {
      throw new Error(String(failed.result ?? "Unable to clear legacy data"));
    }
  } finally {
    await surreal.close();
  }
}
