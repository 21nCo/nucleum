import type { IStore } from "../data.type";
import type { IMemotronItemBase } from "./common.type";

export interface ICurationBase extends IMemotronItemBase {
  description?: string;
}
export interface CurationThumbnail extends ICurationBase {
  type: CurationType;
  itemCount?: number;
  children?: CombinationChild[];
}

export type CombinationChild = CurationThumbnail | CombinationNodeThumbnail;

export type CombinationNodeThumbnail = IMemotronItemBase & {
  children?: CombinationChild[];
};


export interface ICombination extends ICurationBase {
  layout: CombinationViewType;
  data: any;
}

export enum CurationType {
  COLLECTION = "collection",
  COMBINATION = "combination",
  VIEW = "VIEW",
  NODELINKS = "links"
}

export enum CombinationViewType {
  TREE = "TREE",
  GRAPH = "GRAPH",
  INFIGRID = "INFIGRID",
  WHITEBOARD = "WHITEBOARD"
}

export type CurationLocalRecord = ICurationBase & {
  type: CurationType;
};

export interface ICurationStore extends IStore {}
