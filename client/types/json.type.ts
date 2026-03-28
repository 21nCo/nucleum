import type { IUserGlobalPreferences } from "@21n/types/preferences.type";
import type { IActiveSessionStore } from "@21n/types/pointron/session.type";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | IUserGlobalPreferences
  | IActiveSessionStore
  | JsonValue[]
  | { [key: string]: JsonValue };
