import type { AuthFnRegionLookupRecord } from '@authfn/multi-region';
import type { ConditionalKVStoreAdapter } from '@superfunctions/db';

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export interface InMemoryRegionLookupStore extends ConditionalKVStoreAdapter {
  clear(): void;
  records(): AuthFnRegionLookupRecord[];
}

export function createInMemoryRegionLookupStore(
  initialRecords: AuthFnRegionLookupRecord[] = []
): InMemoryRegionLookupStore {
  const records = new Map<string, string>();

  for (const record of initialRecords) {
    const normalized = {
      ...record,
      identifier: normalizeIdentifier(record.identifier)
    };
    records.set(regionLookupStoreKey(normalized.identifier), JSON.stringify(normalized));
  }

  return {
    async get(key) {
      return records.get(key) ?? null;
    },
    async set(input) {
      records.set(input.key, input.value);
    },
    async setIfAbsent(input) {
      const existing = records.get(input.key);
      if (existing) {
        return {
          inserted: false,
          existing
        };
      }

      records.set(input.key, input.value);
      return {
        inserted: true
      };
    },
    async compareAndSet(input) {
      const existing = records.get(input.key) ?? null;
      if (existing !== input.expected) {
        return {
          updated: false,
          ...(existing === null ? {} : { existing })
        };
      }
      records.set(input.key, input.value);
      return { updated: true };
    },
    async delete(key) {
      records.delete(key);
    },
    clear() {
      records.clear();
    },
    records() {
      return Array.from(records.values())
        .map((value) => JSON.parse(value) as AuthFnRegionLookupRecord)
        .map((record) => ({ ...record }));
    }
  };
}

function regionLookupStoreKey(identifier: string): string {
  return `authfn:region:${identifier}`;
}
