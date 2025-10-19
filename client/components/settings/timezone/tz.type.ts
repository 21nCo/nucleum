import type { IResource } from "@21n/components/flux/resourceStores/resource.type";

interface ITimezoneBase {
  offset: number;
  label: string;
  /**
   * @deprecated - use {@link dateUnix} instead
   */
  date?: Date;
  /**
   * The unix timestamp of the date
   */
  dateUnix: number;
}

export interface ITimezoneCapture extends ITimezoneBase {}

export interface ITimezone extends ITimezoneBase, IResource {}
