import type { IMemotronItemBase } from "../memotron.type";

export interface ILinkTag extends IMemotronItemBase {
  prefix?: string;
}

export interface ILinkTagGroup {
  prefix: string;
  items: ILinkTag[];
}
