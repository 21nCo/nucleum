import type { IFile } from "$lib/client/components/files/file.type";
import type { IActiveResource } from "$lib/client/components/flux/resourceStores/resource.type";
import type { IAvatar } from "$lib/client/types/avatar.type";
import type { IRecordId } from "$lib/client/types/data.type";
import type { Arrangement, Placement } from "$lib/client/types/direction.enum";
import type { IMemotronItemBase } from "../memotron.type";
import type { INodeThumb } from "../node/node.type";
import type { IProperty } from "./properties/property.type";

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
    refreshError?: string;
    isViewDataLoading: boolean;
    isViewDataRefreshing: boolean;
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
export interface ICollectionView extends IMemotronItemBase {
  layout: CollectionLayout;
  arrangement?: Arrangement;
  density?: number;
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
