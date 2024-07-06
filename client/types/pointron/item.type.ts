import type { DbRecordBase } from "$lib/client/types/dbrecord.type";
import type { IUserGlobalPreferences } from "$lib/client/types/preferences.type";
import type { PointGoalDbType } from "./goal.type";
import type {
  IFocusItemsStore,
  PointLogDbType,
  PointSessionDbType,
  ISessionStore
} from "./session.type";
import type { PointTagDbType } from "./tag.type";
import type { IPointronPreferences } from "./pointronPreferences.type";

export type DbRecordType = DbRecordBase &
  (
    | PointGoalDbType
    | PointSessionDbType
    | PointLogDbType
    | PointTagDbType
    | ISessionStore
    | IPointronPreferences
    | IUserGlobalPreferences
    | IFocusItemsStore
  );
