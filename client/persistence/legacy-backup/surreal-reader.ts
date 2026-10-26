import {
  type LegacyLocalDataIdentity,
  type LegacyLocalStoreBackup,
  type LegacyLocalRecordBackup
} from "./types";
import { legacyResourceStores } from "@nucleum/persistence/legacy-backup/indexeddb-reader";
import {
  isPlainObject,
  serializeIndexedDbValue
} from "@nucleum/persistence/legacy-backup/serialized-value";
import { normalizeRecordId } from "@nucleum/persistence/legacy-backup/record-conversion";

export async function readSurrealStoreBackups(
  databaseName: string,
  identity: LegacyLocalDataIdentity
): Promise<LegacyLocalStoreBackup[]> {
  const databaseIdentities = resolveLegacySurrealIdentities(identity);
  if (!databaseIdentities.length) {
    throw new Error("Legacy Surreal database identity is unavailable");
  }
  const { surreal } = await createLegacySurrealClient();
  try {
    await surreal.connect(`indxdb://${databaseName}`);
    const storeNames = Array.from(legacyResourceStores);
    const recordsByStore = new Map<
      string,
      Map<string, LegacyLocalRecordBackup>
    >();
    const errorsByStore = new Map<string, string[]>();
    for (const databaseIdentity of databaseIdentities) {
      await surreal.use({ namespace: "user", database: databaseIdentity });
      const statements = (await surreal.queryRaw(
        storeNames.map((name) => `SELECT * FROM ${name};`).join("\n")
      )) as Array<{ status?: string; result?: unknown }>;
      await Promise.all(
        storeNames.map(async (name, statementIndex) => {
          const statement = statements[statementIndex];
          if (statement?.status === "ERR") {
            const errors = errorsByStore.get(name) ?? [];
            errors.push(
              `${databaseIdentity}: ${String(statement.result ?? `Unable to read ${name}`)}`
            );
            errorsByStore.set(name, errors);
            return;
          }
          const values = Array.isArray(statement?.result)
            ? statement.result
            : [];
          const records =
            recordsByStore.get(name) ??
            new Map<string, LegacyLocalRecordBackup>();
          await Promise.all(
            values.map(async (value, recordIndex) => {
              const record = isPlainObject(value) ? value : {};
              const key = normalizeRecordId(record.id);
              records.set(key ?? `${databaseIdentity}:${recordIndex}`, {
                key,
                value: await serializeIndexedDbValue(value)
              });
            })
          );
          recordsByStore.set(name, records);
        })
      );
    }
    return storeNames
      .map((name) => {
        const errors = errorsByStore.get(name);
        const records = Array.from(recordsByStore.get(name)?.values() ?? []);
        return {
          name,
          keyPath: "id",
          autoIncrement: false,
          indexes: [],
          records,
          error: errors?.join("; ")
        };
      })
      .filter((store) => store.records.length > 0 || Boolean(store.error));
  } finally {
    await surreal.close();
  }
}

function resolveLegacySurrealIdentities(identity: LegacyLocalDataIdentity) {
  return normalizeLegacySurrealIdentities([identity.dapId, identity.userId]);
}

export function normalizeLegacySurrealIdentities(
  values: Array<string | undefined>
) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => Boolean(value))
        .map((value) => value.replace(/^user:/, ""))
    )
  );
}

export async function createLegacySurrealClient() {
  const [{ Surreal, escapeIdent }, { surrealdbWasmEngines }] =
    await Promise.all([import("surrealdb"), import("@surrealdb/wasm")]);
  return {
    escapeIdent,
    surreal: new Surreal({
      engines: surrealdbWasmEngines({
        strict: false,
        capabilities: {
          guest_access: true,
          functions: true,
          network_targets: true
        }
      })
    })
  };
}
