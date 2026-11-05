import type { Product } from "@nucleum/client/config/product.type";
import type {
  ISpaceItemTarget,
  ISpaceNavItem,
  ISpaceResourceNavItem,
  SpaceDropPosition
} from "@nucleum/features/spaces/space.type";

/** Keyboard reorder commands for a side nav row. */
export type SpaceKeyboardMove = "up" | "down" | "indent" | "outdent";

/** State and callbacks shared by every row of a space side nav. */
export type ISpaceNavContext = {
  product: Product;
  activeItemId: string | null;
  activeHeadingId?: string;
  isEditMode: boolean;
  /** Section that picked records are added to in edit mode; root when null. */
  targetSectionId: string | null;
  /** Sections the user collapsed. Sections start expanded. */
  collapsedIds: Set<string>;
  /** Markdown page items whose headings are shown. Pages start collapsed. */
  expandedIds: Set<string>;
  editingItemId: string | null;
  draggedItemId: string | null;
  /** Live target records keyed by record id. */
  targets: Record<string, ISpaceItemTarget>;
  isTargetsLoaded: boolean;
  /** Spaces open above the current one, which cannot be focused again. */
  loopIds: Set<string>;
  onOpen: (item: ISpaceResourceNavItem) => void;
  onOpenHeading: (item: ISpaceResourceNavItem, headingId: string) => void;
  onFocusSpace: (item: ISpaceResourceNavItem) => void;
  /** Activates a section row: chooses it as the add target in edit mode, otherwise toggles it. */
  onSelectSection: (id: string) => void;
  /** Toggles a row; `isSection` distinguishes sections from Markdown pages. */
  onToggle: (id: string, isSection: boolean) => void;
  onStartEdit: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onCancelEdit: () => void;
  onDelete: (item: ISpaceNavItem, label: string) => void;
  onAddSection: (parentId?: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (detail: {
    itemId: string;
    targetId: string;
    position: SpaceDropPosition;
  }) => void;
  onKeyboardMove: (id: string, move: SpaceKeyboardMove) => void;
};
