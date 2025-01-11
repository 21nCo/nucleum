import type { IFile } from "$lib/client/components/files/file.type";
import type { IActiveResource } from "$lib/client/components/flux/resourceStores/resource.type";
import type { IAvatar } from "$lib/client/types/avatar.type";
import type { IRecordId } from "$lib/client/types/data.type";
import type { Arrangement, Placement } from "$lib/client/types/direction.enum";
import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import type { INodeThumb } from "$lib/client/products/memotron/node/node.type";
import type { IProperty, IPropertyValue } from "./properties/property.type";

export enum CollectionType {
  TYPED = "TYPED",
  UNTYPED = "UNTYPED",
  QUERY = "QUERY"
}

export enum CollectionLayout {
  BOARD = "BOARD",
  TABLE = "TABLE",
  CALENDAR = "CALENDAR",
  MAP = "MAP"
}

interface ICollectionBase extends IMemotronItemBase {
  type: CollectionType;
  cover?: string;
  coverLayout?: ICoverLayout;
  description?: string;
  isStarred?: boolean;
  isCaptureShortcutEnabled?: boolean;
  query?: string;
  avatar?: IAvatar;
}

export type IActiveCollection = IActiveResource &
  ICollectionExpanded & {
    isViewDataLoading: boolean;
    isPageLoading: boolean;
    totalNodeCount: number;
    views: ICollectionViewWithData[];
  };

export interface ICollectionExpanded extends ICollectionBase {
  properties: IProperty[];
  typeToExtend?: ICollection;
  extendProperties?: IProperty[];
}

export type ICoverLayout = {
  placement?: Placement.Left | Placement.Top | Placement.Right;
  position?: {
    x?: number;
    y?: number;
  };
  size?: {
    width?: number;
    height?: number;
  };
};

export interface ICollection extends ICollectionBase {
  views: IRecordId[];
  /**
   * Type collection to extend - string identifier ex: collection:sometypecollection
   */
  typeToExtend?: IRecordId;
  properties?: IRecordId[];
}

export type ICollectionThumb = ICollectionBase & {
  typeToExtend?: ICollection;
  properties?: IRecordId[];
};

export type ICollectionViewWithData = ICollectionView & {
  data: INodeThumb[];
};
export type ICollectionView = IMemotronItemBase &
  ICollectionViewArrangementConfig & {
    layout: CollectionLayout;

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
    /**
     * Configured properties to show in the view.
     */
    properties?: IRecordId[];
  };

export interface ICollectionViewArrangementConfig {
  arrangement?: Arrangement;
  /**
   * Hides previews for thumbnails of nodes in a collection view if enabled.
   */
  isHideThumbnailPreview?: boolean;
  /**
   * Hides title for thumbnails of nodes in a collection view if enabled. Currently only used for Masonry arrangement.
   */
  isHideThumbnailTitle?: boolean;
  density?: number;
}

//TODO - add more collectible items
export type ICollectionItem = INodeThumb;

export type ICollectionItemPropertyValue = {
  id: IRecordId;
  value: IPropertyValue | null;
};
