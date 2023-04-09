import type { UserPreferences } from "./preferences.type";
import type { SessionStore } from "./session.type";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | UserPreferences
  | SessionStore
  | JsonValue[]
  | { [key: string]: JsonValue };