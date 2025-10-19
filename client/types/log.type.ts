import type { IStore } from "@21n/types/data.type";

export interface LogStore extends IStore {
  items: DebugLog[];
}

export type DebugLog = {
  message: string;
  type: "error" | "info" | "warn";
  timestamp: string;
};
