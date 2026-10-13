import {
  type DatafnStorageAdapter,
  IndexedDbStorageAdapter
} from "@datafn/client";
import type { Product } from "@nucleum/client/config/product.type";
import { nucleumDatafnSchema } from "@nucleum/schema";
import { deleteIndexedDbDatabase } from "@nucleum/persistence/indexeddb/delete-database";

/** Closes a runtime storage adapter when one is installed. */
export async function closeNucleumDatafnRuntimeStorage(
  storage: DatafnStorageAdapter | undefined
) {
  if (!storage) return;
  await storage.close();
}

/** Deletes the selected local data and search databases. */
export async function deleteDatafnLocalClone(storageDbName: string) {
  await Promise.all([
    deleteIndexedDbDatabase(storageDbName),
    deleteIndexedDbDatabase(`${storageDbName}-search`)
  ]);
}

/** Names a product DataFn database before namespace scoping. */
export function resolveDatafnBaseDbName(input: {
  product: Product;
  env?: string;
}) {
  const product = input.product.toString().trim().toLowerCase();
  const env = input.env?.toString().trim().toLowerCase() || "dev";
  return `nucleum-datafn-${env}-${product}`;
}

/** Names the namespace-scoped DataFn database. */
export function resolveDatafnStorageDbName(input: {
  product: Product;
  namespace: string;
  env?: string;
}) {
  return `${resolveDatafnBaseDbName(input)}_${input.namespace.replace(/:/g, "_")}`;
}

/** Creates namespace-scoped IndexedDB storage. */
export function createDatafnStorage(input: {
  product: Product;
  namespace: string;
  env?: string;
}) {
  const storage = IndexedDbStorageAdapter.createForNamespace(
    resolveDatafnBaseDbName(input),
    input.namespace,
    undefined,
    nucleumDatafnSchema
  );
  return {
    storage,
    dbName: storage.dbName
  };
}

const nodeMdChildOrderMigrationId = "kv:migration:node-md-child-order-v1";

/** Migrates stored node child order once per local database. */
export async function migrateDatafnNodeMdChildOrder(
  storage?: DatafnStorageAdapter | null
) {
  if (!storage) return;
  const marker = await storage
    .getRecord("kv", nodeMdChildOrderMigrationId)
    .catch(() => null);
  if (marker) return;
  const records = await storage.listRecords("node");
  let migratedCount = 0;
  for (const record of records) {
    if (!("children" in record)) continue;
    const { children, ...nextRecord } = record;
    if (!Array.isArray(nextRecord.mdChildOrder) && Array.isArray(children)) {
      nextRecord.mdChildOrder = children;
      migratedCount++;
    }
    await storage.upsertRecord("node", nextRecord);
  }
  await storage.upsertRecord("kv", {
    id: nodeMdChildOrderMigrationId,
    value: true,
    migratedCount,
    migratedAt: new Date().toISOString()
  });
}
