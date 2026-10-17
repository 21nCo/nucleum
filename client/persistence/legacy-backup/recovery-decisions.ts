import type { Product } from "@nucleum/schema/product.type";
import type {
  LegacyLocalDataSummary,
  LegacyLocalDataBackup,
  LegacyLocalDataRecoveryDecision
} from "./types";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { clientStorage } from "@nucleum/persistence/client-storage";
import {
  resolveActiveLegacyLocalDataIdentity,
  readLegacyLocalDataRecoveryDecisions,
  resolveLegacyLocalDataRecoveryDecisionKey,
  resolveLegacySourceDatabaseNames,
  resolveLegacyLocalDataRecoveryDecisionKeyFromParts,
  resolveLegacyIdentityScope,
  resolvePendingLegacyLocalDataRecoveryDecisions
} from "./recovery-identity";

/** Reads the saved recovery choice for the current identity. */
export async function getLegacyLocalDataRecoveryDecision(
  product: Product,
  source?: LegacyLocalDataSummary | LegacyLocalDataBackup
) {
  const decisions = await readLegacyLocalDataRecoveryDecisions();
  const key = await resolveLegacyLocalDataRecoveryDecisionKey(product, source);
  return decisions[key];
}

/** Persists a recovery choice scoped to product and identity. */
export async function saveLegacyLocalDataRecoveryDecision(
  decision: Omit<
    LegacyLocalDataRecoveryDecision,
    "identity" | "sourceDatabases"
  >,
  source?: LegacyLocalDataSummary | LegacyLocalDataBackup
) {
  const decisions = await readLegacyLocalDataRecoveryDecisions();
  const identity = await resolveActiveLegacyLocalDataIdentity();
  const sourceDatabases = resolveLegacySourceDatabaseNames(source);
  const key = resolveLegacyLocalDataRecoveryDecisionKeyFromParts(
    decision.product,
    identity,
    sourceDatabases
  );
  decisions[key] = {
    ...decision,
    identity: resolveLegacyIdentityScope(identity),
    sourceDatabases
  };
  await clientStorage.set(
    ClientStorageKey.LEGACY_LOCAL_DATA_RECOVERY,
    decisions
  );
}

/** Marks pending legacy cloud uploads complete. */
export async function completeLegacyLocalDataCloudUpload(product: Product) {
  const { decisions, pending } =
    await resolvePendingLegacyLocalDataRecoveryDecisions(product);
  for (const decision of pending) {
    decision.isCloudUploadPending = false;
  }
  if (pending.length > 0) {
    await clientStorage.set(
      ClientStorageKey.LEGACY_LOCAL_DATA_RECOVERY,
      decisions
    );
  }
}

/** Checks for a pending cloud upload for the current identity. */
export async function hasPendingLegacyLocalDataCloudUpload(product: Product) {
  const { pending } =
    await resolvePendingLegacyLocalDataRecoveryDecisions(product);
  return pending.length > 0;
}
