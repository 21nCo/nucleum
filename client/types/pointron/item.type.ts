import type { DbRecordBase } from "$lib/client/types/dbrecord.type";
import type { UserGlobalPreferences } from "$lib/client/types/preferences.type";
import type { PointGoalDbType } from "./goal.type";
import type {
  FocusItemsStore,
  PointLogDbType,
  PointSessionDbType,
  SessionStore
} from "./session.type";
import type { PointTagDbType } from "./tag.type";
import type { PointronPreferences } from "./pointronPreferences.type";

export type DbRecordType = DbRecordBase &
  (
    | PointGoalDbType
    | PointSessionDbType
    | PointLogDbType
    | PointTagDbType
    | SessionStore
    | PointronPreferences
    | UserGlobalPreferences
    | FocusItemsStore
  );
