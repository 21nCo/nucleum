import type {
  IActiveResource,
  IResourceLabeled,
  IResourceStarrable
} from "@nucleum/datafn/resource.type";
import type { Resource } from "@nucleum/datafn/resource.enum";
import type { IMemotronItemBase } from "@nucleum/features/memory/memory.type";
import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";

/** How a space lays out its items. Stored on the space record. */
export enum SpaceView {
  SIDENAV = "sidenav",
  WALL = "wall"
}

/** Kind of an entry in a space's item tree. */
export enum SpaceNavItemType {
  SECTION = "section",
  RESOURCE = "resource",
  PAGE = "page"
}

/** Fields shared by every entry in a space's item tree. */
export interface ISpaceNavItemBase {
  id: string;
  /** Section name, or the target's label captured when the item was added. */
  label: string;
  description?: string;
  /** Section avatar, or the target's avatar captured when the item was added. */
  avatar?: IAvatar;
  children?: ISpaceNavItem[];
}

/** A named group of items. Only sections hold children. */
export interface ISpaceSectionNavItem extends ISpaceNavItemBase {
  type: SpaceNavItemType.SECTION;
}

/** A reference to a record, including another space. */
export interface ISpaceResourceNavItem extends ISpaceNavItemBase {
  type: SpaceNavItemType.RESOURCE;
  resourceId: IRecordId;
  resourceType: Resource;
}

/**
 * A link to an app page by its URL path, such as `library/objective/all`. The label
 * captured when the item was added is shown when the product has no such page.
 */
export interface ISpacePageNavItem extends ISpaceNavItemBase {
  type: SpaceNavItemType.PAGE;
  /** Page path without leading or trailing slashes. */
  path: string;
}

/** An item that opens something: a record or an app page. */
export type ISpaceLeafNavItem = ISpaceResourceNavItem | ISpacePageNavItem;

export type ISpaceNavItem =
  ISpaceSectionNavItem | ISpaceResourceNavItem | ISpacePageNavItem;

/** Persisted space record. */
export type ISpace = IMemotronItemBase &
  IResourceLabeled &
  Partial<IResourceStarrable> & {
    view?: SpaceView;
    description?: string;
    avatar?: IAvatar;
    items: ISpaceNavItem[];
  };

/** Space record with its open-state flags. */
export interface IActiveSpace extends IActiveResource, ISpace {
  isPageLoading?: boolean;
  /** True when the record could not be found locally. */
  isMissing?: boolean;
  /** True when reading the record failed, so it is unknown whether it exists. */
  isLoadFailed?: boolean;
  /** True while the title is being renamed in the header. */
  isTitleEditing?: boolean;
}

/** Target record fields used to render a space item live. */
export type ISpaceItemTarget = {
  id: string;
  label?: string;
  text?: string;
  avatar?: IAvatar;
  contentType?: string;
  isArchived?: boolean;
  trashedAt?: number | string | null;
};

/** A heading of a Markdown page arranged by heading level. */
export type ISpaceHeading = {
  id: string;
  label: string;
  level: number;
  children: ISpaceHeading[];
};

/** Position of a dragged item relative to a drop target. */
export type SpaceDropPosition = "before" | "after" | "inside";
