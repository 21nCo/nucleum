import type { IResource } from "../../flux/resourceStores/resource.type";

export interface ITimezone extends IResource {
  offset: number;
  label: string;
  /**
   * @deprecated - use {@link dateUnix} instead
   */
  date?: string;
  /**
   * The unix timestamp of the date
   */
  dateUnix: number;
}
