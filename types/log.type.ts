import type { CacheableStore } from "./store.type";

export interface LogStore extends CacheableStore {
  items: DebugLog[];
}

export type DebugLog = {
  message: string;
  type: "error" | "info" | "warn";
  timestamp: string;
};
