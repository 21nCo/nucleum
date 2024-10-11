import type { IMemotronItemBase } from "../memotron.type";

export interface ILinkTag extends IMemotronItemBase {
  group?: string;
}

export interface ILinkTagGroup {
  group: string;
  items: ILinkTag[];
}
