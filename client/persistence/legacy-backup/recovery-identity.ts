import { Product } from "@nucleum/schema/product.type";
import { parse } from "@21n/shared-utils/json.utils";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { clientStorage } from "@nucleum/persistence/client-storage";

import {
  type LegacyLocalDataRecoveryDecision,
  type LegacyLocalDataIdentity,
  type LegacyLocalDataSummary,
  type LegacyLocalDataBackup
} from "./types";
import {
  parseStoredPlainObject,
  isPlainObject
} from "@nucleum/persistence/legacy-backup/serialized-value";
import { resolveRecordId } from "@nucleum/persistence/legacy-backup/record-conversion";

export async function readLegacyLocalDataRecoveryDecisions(): Promise<
  Record<string, LegacyLocalDataRecoveryDecision>
> {
  const value = await clientStorage.get(
    ClientStorageKey.LEGACY_LOCAL_DATA_RECOVERY
  );
  if (!value) return {};
  try {
    const parsed = typeof value === "string" ? parse(value) : value;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, LegacyLocalDataRecoveryDecision>)
      : {};
  } catch {
    return {};
  }
}

export async function resolvePendingLegacyLocalDataRecoveryDecisions(
  product: Product
) {
  const decisions = await readLegacyLocalDataRecoveryDecisions();
  const identity = resolveLegacyIdentityScope(
    await resolveActiveLegacyLocalDataIdentity()
  );
  return {
    decisions,
    pending: Object.values(decisions).filter(
      (decision) =>
        decision.product === product &&
        decision.identity === identity &&
        decision.isCloudUploadPending === true
    )
  };
}

export async function resolveActiveLegacyLocalDataIdentity(): Promise<LegacyLocalDataIdentity> {
  const [storedUserInfo, storedUser, dapId] = await Promise.all([
    clientStorage.get(ClientStorageKey.USER_INFO),
    clientStorage.get(ClientStorageKey.USER),
    clientStorage.get(ClientStorageKey.DAP_ID)
  ]);
  const userInfo = parseStoredPlainObject(storedUserInfo);
  const user = parseStoredPlainObject(storedUser);
  const userId = resolveRecordId(
    userInfo?.id,
    user?.actorId,
    isPlainObject(user?.subject) ? user.subject.id : undefined
  )?.replace(/^user:/, "");
  return {
    userId,
    dapId: typeof dapId === "string" ? dapId.trim() || undefined : undefined
  };
}

export async function resolveLegacyLocalDataRecoveryDecisionKey(
  product: Product,
  source?: LegacyLocalDataSummary | LegacyLocalDataBackup
) {
  return resolveLegacyLocalDataRecoveryDecisionKeyFromParts(
    product,
    await resolveActiveLegacyLocalDataIdentity(),
    resolveLegacySourceDatabaseNames(source)
  );
}

export function resolveLegacyLocalDataRecoveryDecisionKeyFromParts(
  product: Product,
  identity: LegacyLocalDataIdentity,
  sourceDatabases: string[]
) {
  return `${product}:${resolveLegacyIdentityScope(identity)}:${sourceDatabases.join("|")}`;
}

export function resolveLegacyIdentityScope(identity: LegacyLocalDataIdentity) {
  if (identity.userId) return `user:${identity.userId}`;
  if (identity.dapId) return `guest:${identity.dapId}`;
  return "unknown";
}

export function resolveLegacySourceDatabaseNames(
  source?: LegacyLocalDataSummary | LegacyLocalDataBackup
) {
  return (source?.databases.map((database) => database.name) ?? []).sort(
    (left, right) => left.localeCompare(right)
  );
}
