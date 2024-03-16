import type { CacheableStore } from "./data.type";

export interface LogStore extends CacheableStore {
  items: DebugLog[];
}

export type DebugLog = {
  message: string;
  type: "error" | "info" | "warn";
  timestamp: string;
};
