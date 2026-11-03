import type { Product } from "@nucleum/client/config/product.type";
import type {
  ISpaceNavItem,
  ISpaceResourceNavItem
} from "@nucleum/features/spaces/space.type";

/** State and callbacks shared by every group and card of a space wall. */
export type ISpaceWallContext = {
  spaceId: string;
  product: Product;
  isEditMode: boolean;
  /** Section that picked records are added to in edit mode; root when null. */
  targetSectionId: string | null;
  editingSectionId: string | null;
  /** Live target records keyed by record id, with the fields thumbnails render. */
  targets: Record<string, Record<string, unknown>>;
  isTargetsLoaded: boolean;
  /** Live item counts of collection targets keyed by collection id. */
  collectionCounts: Record<string, number>;
  /** Spaces open above the current one, which cannot be focused again. */
  loopIds: Set<string>;
  onOpen: (item: ISpaceResourceNavItem) => void;
  onOpenHeading: (item: ISpaceResourceNavItem, headingId: string) => void;
  onFocusSpace: (item: ISpaceResourceNavItem) => void;
  /** Chooses a section as the add target in edit mode. */
  onSelectSection: (id: string) => void;
  onStartEdit: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onCancelEdit: () => void;
  onDelete: (item: ISpaceNavItem, label: string) => void;
  onAddSection: (parentId?: string) => void;
};
