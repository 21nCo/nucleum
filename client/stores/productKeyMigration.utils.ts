const LEGACY_NUCLEUS_PREFIX = "nucleus-";
const CURRENT_NUCLEUM_PREFIX = "nucleum-";

/**
 * Copies legacy Nucleus product-scoped values to their current Nucleum keys.
 */
export function migrateLegacyNucleusProductKeys<
  T extends Record<string, unknown>
>(data: T): T {
  const migrated = { ...data };

  Object.entries(data).forEach(([key, value]) => {
    if (!key.startsWith(LEGACY_NUCLEUS_PREFIX)) return;

    const migratedKey = `${CURRENT_NUCLEUM_PREFIX}${key.slice(
      LEGACY_NUCLEUS_PREFIX.length
    )}`;
    if (!Object.prototype.hasOwnProperty.call(migrated, migratedKey)) {
      migrated[migratedKey as keyof T] = value as T[keyof T];
    }
  });

  return migrated;
}
