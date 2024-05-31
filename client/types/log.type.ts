import type { ICacheableStore } from "./data.type";

export interface LogStore extends ICacheableStore {
  items: DebugLog[];
}

export type DebugLog = {
  message: string;
  type: "error" | "info" | "warn";
  timestamp: string;
};
