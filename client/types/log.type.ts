import type { IStore } from "./data.type";

export interface LogStore extends IStore {
  items: DebugLog[];
}

export type DebugLog = {
  message: string;
  type: "error" | "info" | "warn";
  timestamp: string;
};
