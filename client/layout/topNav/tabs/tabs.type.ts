import type { IRecordId } from "@21n/types/data.type";
import type { Action } from "@21n/types/action.enum";

export type HorizontalTrail = {
  path: (Action | IRecordId)[];
  isBaseNonRecord?: boolean;
  activated?: Action | IRecordId;
};

export type VerticalTrail = {
  items: IRecordId[];
  base?: Action | IRecordId;
  activated?: Action | IRecordId;
};
