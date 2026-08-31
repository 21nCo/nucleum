export type DatafnImportResult = {
  ok?: boolean;
  errors?: Array<{ message?: string }>;
  stats?: {
    resources?: Record<string, { imported?: number; skipped?: number }>;
    joins?: Record<string, { imported?: number; skipped?: number }>;
  };
};

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

export type NucleumDatafnE2eeState = {
  enabled: boolean;
  unlocked: boolean;
  keyRef: string | null;
};

export type OptimisticKvEntry = {
  token: symbol;
  value: unknown;
};

export type OptimisticKvEntries = Map<string, OptimisticKvEntry[]>;
