import type { IUserGlobalPreferences } from "@21n/types/preferences.type";
import type { SessionStore } from "@21n/types/session.type";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | IUserGlobalPreferences
  | SessionStore
  | JsonValue[]
  | { [key: string]: JsonValue };
