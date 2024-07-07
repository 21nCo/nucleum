import type { IMemotronItemBase } from "./common.type";
import type { INodeThumbnail, NodeThumbnailVariant } from "./node.type";


export enum CollectionType {
  TYPED = "TYPED",
  UNTYPED = "UNTYPED",
  QUERY = "QUERY"
}


export enum CollectionLayout {
  BOARD = "BOARD",
  TABLE = "TABLE",
  HEATMAP = "HEATMAP",
  GEOMAP = "GEOMAP"
}

export type IActiveCollection = {
  type: CollectionType;
  isRefreshing: boolean;
} & ICollection;


export interface ICollection extends IMemotronItemBase {
  views: ICollectionView[];
  query?: string;
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

export interface ICurationCreationForm {
  label: string;
  type: CollectionType;
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


export type CollectionLocalRecord = ICollection