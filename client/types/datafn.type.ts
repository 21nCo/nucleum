/** Application-owned result contract for DataFn import operations. */
export type DatafnImportResult = {
  ok?: boolean;
  errors?: Array<{ message?: string }>;
  stats?: {
    resources?: Record<string, { imported?: number; skipped?: number }>;
    joins?: Record<string, { imported?: number; skipped?: number }>;
  };
};

/** Persisted configuration for Nucleum DataFn end-to-end encryption. */
export type NucleumDatafnE2eeSettings = {
  version: 1;
  enabled: boolean;
  recoveryRequired?: "restore-remote";
  keyRef?: string;
  salt?: string;
  iterations?: number;
  wrapIv?: string;
  wrappedDek?: string;
  updatedAt: number;
};

/** Current client state for Nucleum DataFn end-to-end encryption. */
export type NucleumDatafnE2eeState = {
  enabled: boolean;
  unlocked: boolean;
  keyRef: string | null;
};

/** One identity-tracked optimistic DataFn KV value. */
export type OptimisticKvEntry = {
  token: symbol;
  value: unknown;
};

/** Pending optimistic DataFn KV values grouped by field. */
export type OptimisticKvEntries = Map<string, OptimisticKvEntry[]>;
