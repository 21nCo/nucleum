import type {
  IActiveResource,
  IResourceLabeled,
  IResourceStarrable
} from "$lib/client/components/flux/resourceStores/resource.type";
import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import type { IAvatar } from "$lib/client/types/avatar.type";
import type { IRecordId } from "$lib/client/types/data.type";

export enum CombinationNavItemType {
  SECTION = "section",
  RESOURCE = "resource"
}

export interface ICombinationNavItemBase {
  id: string;
  label: string;
  description?: string;
  avatar?: IAvatar;
  children?: ICombinationNavItem[];
}

export interface ICombinationSectionNavItem extends ICombinationNavItemBase {
  type: CombinationNavItemType.SECTION;
}

export interface ICombinationResourceNavItem extends ICombinationNavItemBase {
  type: CombinationNavItemType.RESOURCE;
  resourceId: IRecordId;
  resourceType: Resource;
  resourceLabel?: string;
  resourceAvatar?: IAvatar;
}

export type ICombinationNavItem =
  | ICombinationSectionNavItem
  | ICombinationResourceNavItem;

type ICombinationBase = IMemotronItemBase &
  IResourceLabeled &
  Partial<IResourceStarrable> & {
    type: CombinationType;
    description?: string;
    avatar?: IAvatar;
  };

export interface ISideNavCombination extends ICombinationBase {
  items: ICombinationNavItem[];
}

export type ICombination = ISideNavCombination;

export interface IActiveCombination extends IActiveResource, ISideNavCombination {
  isPageLoading?: boolean;
}

export enum CombinationType {
  SIDENAV = "sidenav",
  WHITEBOARD = "whiteboard",
  MINDMAP = "mindmap",
  WALL = "wall",
  /**
   * Previous - Pyramid, Funnel views merged into regular timeline view.
   */
  TIMELINE = "timeline"
}
