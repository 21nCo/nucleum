export enum ImportSource {
  POCKET = "POCKET"
}

export enum StepType {
  UPLOAD = "UPLOAD",
  NON_INTERACTIVE = "NON_INTERACTIVE"
}

export interface ImportHistoryItem {
  id: string;
  source: ImportSource;
  fileName: string;
  createdAt: string;
  totalRecords: number;
  status: "SUCCESS" | "FAILED" | "IN_PROGRESS";
}
