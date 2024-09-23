import type { IFile } from "$lib/client/components/files/file.type";
import type { IAvatar } from "$lib/client/types/avatar.type";
import type { IRecordId } from "$lib/client/types/data.type";
import type { Arrangement, Placement } from "$lib/client/types/direction.enum";
import type { IMemotronItemBase } from "../memotron.type";
import type { INodeThumbnail } from "../node/node.type";
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
  GEOMAP = "GEOMAP"
}

export type IActiveCollection = ICollection & {
  type: CollectionType;
  refreshError?: string;
  isViewDataLoading: boolean;
  isViewDataRefreshing: boolean;
  isPageLoading: boolean;
  views: ICollectionViewWithData[];
  properties: IProperty[];
};

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

export interface ICollection extends IMemotronItemBase {
  views: IRecordId[];
  type: CollectionType;
  cover?: string;
  coverLayout?: ICoverLayout;
  description?: string;
  isStarred?: boolean;
  isCaptureShortcutEnabled?: boolean;
  /**
   * Type collection to extend - string identifier ex: collection:sometypecollection
   */
  typeToExtend?: IRecordId;
  avatar?: Pick<IAvatar, "code" & "color" & "isFilled" & "type">;
  query?: string;
  properties?: IRecordId[];
}

export type ICollectionThumb = ICollection & {
  cover?: IFile;
};

export type ICollectionViewWithData = ICollectionView & {
  data: INodeThumbnail[];
};
export interface ICollectionView extends IMemotronItemBase {
  layout: CollectionLayout;
  arrangement?: Arrangement;
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
