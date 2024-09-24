import type { IFile } from "$lib/client/components/files/file.type";
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
  GEOMAP = "GEOMAP"
}

interface ICollectionBase extends IMemotronItemBase {
  type: CollectionType;
  cover?: string;
  coverLayout?: ICoverLayout;
  description?: string;
  isStarred?: boolean;
  isCaptureShortcutEnabled?: boolean;
  query?: string;
  avatar?: Pick<IAvatar, "code" & "color" & "isFilled" & "type">;
}

export interface IActiveCollection extends ICollectionBase {
  refreshError?: string;
  isViewDataLoading: boolean;
  isViewDataRefreshing: boolean;
  isPageLoading: boolean;
  views: ICollectionViewWithData[];
  properties: IProperty[];
  typeToExtend?: IActiveCollection;
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

export type ICollectionThumb = ICollection & {
  cover?: IFile;
};

export type ICollectionViewWithData = ICollectionView & {
  data: INodeThumb[];
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
