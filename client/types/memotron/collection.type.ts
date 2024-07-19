import type { IAvatar } from "../avatar.type";
import type { IMemotronItemBase } from "./common.type";
import type { NodeThumbnailVariant } from "./node.type";

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
  views: string[];
  type: CollectionType;
  cover?: string;
  description?: string;
  isStarred?: boolean;
  isCaptureShortcutEnabled?: boolean;
  /**
   * Type collection to extend - string identifier ex: collection:sometypecollection
   */
  typeToExtend?: string;
  avatar?: IAvatar;
  query?: string;
  properties?: string[];
}

export interface ICollectionView extends IMemotronItemBase {
  layout: CollectionLayout;
  // data?: INodeThumbnail[];
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
