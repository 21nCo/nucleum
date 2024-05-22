import type { MemotronItemBase } from "./common.type";

export interface CurationBase extends MemotronItemBase {
  description?: string;
}

export interface CurationCreationForm {
  label: string;
  type: CurationType;
  defaultView: string;
  query?: string;
  cover?: string;
  description?: string;
  isStarred?: boolean;
}

export interface CurationThumbnail extends CurationBase {
  type: CurationType;
  itemCount?: number;
  children?: CombinationChild[];
}

export type CombinationChild = CurationThumbnail | CombinationNodeThumbnail;

export type CombinationNodeThumbnail = MemotronItemBase & {
  children?: CombinationChild[];
};

export interface Collection extends CurationBase {
  views: CollectionView[];
  defaultView: string;
  query?: string;
  cover?: string;
}

export interface CollectionView extends CurationBase {
  type: CollectionViewType;
  data: any;
}
export interface Combination extends CurationBase {
  layout: CombinationViewType;
  data: any;
}

export enum CurationType {
  COLLECTION = "collection",
  COMBINATION = "combination",
  VIEW = "VIEW",
  NODELINKS = "links"
}

export enum CollectionViewType {
  BASIC = "BASIC",
  TABLE = "TABLE",
  HEATMAP = "HEATMAP",
  GEOMAP = "GEOMAP"
}

export enum CombinationViewType {
  TREE = "TREE",
  GRAPH = "GRAPH",
  INFIGRID = "INFIGRID",
  WHITEBOARD = "WHITEBOARD"
}

export type ActiveCurationStore<T = Collection | Combination> = {
  type: CurationType;
  isRefreshing: boolean;
} & T;

export type CurationLocalRecord = CurationBase & {
  type: CurationType;
};
