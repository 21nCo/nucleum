import type { Product } from "@nucleum/schema/product.type";
import type {
  LegacyLocalDataSummary,
  LegacyLocalDataBackup,
  LegacyLocalDatabaseSummary,
  LegacyLocalDatabaseBackup
} from "./types";
import { resolveActiveLegacyLocalDataIdentity } from "./recovery-identity";
import {
  listExistingIndexedDatabases,
  resolveLegacyIndexedDbFallbackDescriptors,
  shouldIgnoreDatabase,
  openExistingIndexedDatabase,
  resolveLegacyLocalDataProvider,
  readStoreSummaries,
  readStoreBackups
} from "./indexeddb-reader";
import { readSurrealStoreBackups } from "./surreal-reader";

/** Discovers legacy local databases without changing them. */
export async function detectLegacyLocalData(
  product: Product
): Promise<LegacyLocalDataSummary> {
  if (typeof indexedDB === "undefined") {
    return { isSupported: false, databases: [] };
  }

  const databases: LegacyLocalDatabaseSummary[] = [];
  const identity = await resolveActiveLegacyLocalDataIdentity();
  const descriptors =
    (await listExistingIndexedDatabases()) ??
    resolveLegacyIndexedDbFallbackDescriptors(product, identity);
  for (const descriptor of descriptors) {
    const name = descriptor.name;
    if (!name || shouldIgnoreDatabase(name)) continue;
    const database = await openExistingIndexedDatabase(name).catch(() => null);
    if (!database) continue;
    try {
      const storeNames = Array.from(database.objectStoreNames);
      const provider = resolveLegacyLocalDataProvider(
        product,
        name,
        storeNames,
        identity
      );
      if (!provider) continue;
      if (provider === "surreal") {
        database.close();
        const surrealStores = await readSurrealStoreBackups(
          name,
          identity
        ).catch((error) => [
          {
            name: "surreal",
            keyPath: null,
            autoIncrement: false,
            indexes: [],
            records: [],
            error: error instanceof Error ? error.message : String(error)
          }
        ]);
        databases.push({
          name,
          version: database.version,
          provider,
          stores: surrealStores.map((store) => ({
            name: store.name,
            count: store.records.length,
            error: store.error
          }))
        });
        continue;
      }
      const stores = await readStoreSummaries(database, storeNames);
      databases.push({
        name,
        version: database.version,
        provider,
        stores
      });
    } finally {
      database.close();
    }
  }

  return { isSupported: true, databases };
}

/** Exports discovered legacy databases into a portable backup. */
export async function exportLegacyLocalData(
  product: Product
): Promise<LegacyLocalDataBackup | undefined> {
  const summary = await detectLegacyLocalData(product);
  if (!summary.databases.length) return undefined;

  const databases: LegacyLocalDatabaseBackup[] = [];
  const identity = await resolveActiveLegacyLocalDataIdentity();
  for (const item of summary.databases) {
    if (item.provider === "surreal") {
      databases.push({
        name: item.name,
        version: item.version,
        provider: item.provider,
        stores: await readSurrealStoreBackups(item.name, identity)
      });
      continue;
    }
    const database = await openExistingIndexedDatabase(item.name).catch(
      () => null
    );
    if (!database) continue;
    try {
      databases.push({
        name: item.name,
        version: database.version,
        provider: item.provider,
        stores: await readStoreBackups(
          database,
          Array.from(database.objectStoreNames)
        )
      });
    } finally {
      database.close();
    }
  }

  return {
    schema: "nucleum-legacy-local-data-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    product,
    databases
  };
}
