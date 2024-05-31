import type { ICacheableStore } from "../data.type";
import type { IMemotronItemBase } from "./common.type";
import type { INodeThumbnail, NodeThumbnailVariant } from "./node.type";
import type { IType } from "./type.type";

export interface ICurationBase extends IMemotronItemBase {
  description?: string;
}

export interface ICurationCreationForm {
  label: string;
  type: CurationType;
  defaultLayout: CollectionLayout;
  query?: string;
  cover?: string;
  description?: string;
  isStarred?: boolean;
  /**
   * Associated type of the collection - string identifier ex: type:sometype
   */
  associatedType?: string;
  isSearchQuery?: boolean;
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

export interface ICollection extends ICurationBase {
  views: ICollectionView[];
  query?: string;
  /**
   * Associated type of the collection
   */
  associatedType?: IType;
  cover?: string;
}

export interface ICollectionView extends IMemotronItemBase {
  layout: CollectionLayout;
  data?: INodeThumbnail[];
  arrangement?: NodeThumbnailVariant;
  /**
   * Property id to show as tabs.
   * "none" for no tabs.
   */
  tabBy: string;
  /**
   * Property id to group by.
   * "none" for no grouping.
   */
  groupBy: string;
  /**
   * Property id to sub group by.
   * "none" for no sub grouping.
   */
  subGroupBy: string;
  /**
   * Configured tabs for non select type property.
   *
   * Ex: datetime, location or text property with criteria etc
   */
  tabs?: any[];
}
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

export enum CollectionLayout {
  BOARD = "BOARD",
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

export type IActiveCollection = {
  type: CurationType;
  isRefreshing: boolean;
} & ICollection;

export type CurationLocalRecord = ICurationBase & {
  type: CurationType;
};

export interface ICurationStore extends ICacheableStore {}
