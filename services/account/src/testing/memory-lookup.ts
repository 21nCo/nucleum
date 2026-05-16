import type {
  AuthFnRegionLookupRecord,
  AuthFnRegionLookupStore
} from '@authfn/core';

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export interface InMemoryRegionLookupStore extends AuthFnRegionLookupStore {
  clear(): void;
  records(): AuthFnRegionLookupRecord[];
}

export function createInMemoryRegionLookupStore(
  initialRecords: AuthFnRegionLookupRecord[] = []
): InMemoryRegionLookupStore {
  const records = new Map<string, AuthFnRegionLookupRecord>();

  for (const record of initialRecords) {
    records.set(normalizeIdentifier(record.identifier), {
      ...record,
      identifier: normalizeIdentifier(record.identifier)
    });
  }

  return {
    async getByIdentifier(identifier) {
      return records.get(normalizeIdentifier(identifier)) ?? null;
    },
    async putIfAbsent(record) {
      const normalized = normalizeIdentifier(record.identifier);
      const existing = records.get(normalized);
      if (existing) {
        return {
          inserted: false,
          existing
        };
      }

      records.set(normalized, {
        ...record,
        identifier: normalized
      });
      return {
        inserted: true
      };
    },
    async update(record) {
      const normalized = normalizeIdentifier(record.identifier);
      const updated = {
        ...record,
        identifier: normalized,
        updatedAt: record.updatedAt ?? new Date().toISOString()
      };
      records.set(normalized, updated);
      return updated;
    },
    async deleteByIdentifier(identifier) {
      records.delete(normalizeIdentifier(identifier));
    },
    clear() {
      records.clear();
    },
    records() {
      return Array.from(records.values()).map((record) => ({ ...record }));
    }
  };
}
