/** Application-owned result contract for DataFn import operations. */
export type DatafnImportResult = {
  ok?: boolean;
  errors?: Array<{ message?: string }>;
  stats?: {
    resources?: Record<string, { imported?: number; skipped?: number }>;
    joins?: Record<string, { imported?: number; skipped?: number }>;
  };
};
