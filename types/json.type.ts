import type { UserGlobalPreferences } from "./preferences.type";
import type { SessionStore } from "./session.type";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | UserGlobalPreferences
  | SessionStore
  | JsonValue[]
  | { [key: string]: JsonValue };