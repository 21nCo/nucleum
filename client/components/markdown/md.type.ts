import type { IAvatar } from "$lib/client/types/avatar.type";
import type {
  IObservableStoreSubject,
  IRecordId
} from "$lib/client/types/data.type";
import type {
  NodeContent,
  ListChild,
  ListContent,
  TextContent,
  NodeType,
  ListType
} from "../../products/memotron/node/node.type";
import type { IResourceBase } from "../flux/resourceStores/resource.type";

export type IMarkdownStore = IMarkdown &
  IObservableStoreSubject & {
    /**
     * @deprecated - use focus writable on MarkdownStore instead
     */
    blockToFocus?: string;
    reRenderBlock?: string;
    params?: IMarkdownParams;
    activeHeading: string;
  };
export type IMarkdown = { blocks: IBlock[] };
export type DbBlock = IResourceBase & IBlock;

export type IBlock<T = NodeContent> = T & {
  id: IRecordId;
  childrenHierarchy?: IRecordId[];
};
export enum InlineType {
  MENTION = "MENTION",
  DATE = "DATE",
  LINK = "LINK",
  LINK_MENTION = "LINK_MENTION",
  CODE = "CODE",
  BOLD = "BOLD",
  ITALIC = "ITALIC",
  UNDERLINE = "UNDERLINE",
  STRIKE = "STRIKE",
  SUBSCRIPT = "SUBSCRIPT",
  SUPERSCRIPT = "SUPERSCRIPT"
}

export type IMarkdownParams = {
  isNodular?: boolean;
  placeholder?: string;
  actions?: string[];
  isReadOnly?: boolean;
  title?: string;
  canUseSlashShortcut?: boolean;
};

export enum BlockContext {
  DEFAULT = "DEFAULT",
  LIST_CHILD = "LIST_CHILD"
}

export type ListBlockWithChildren =
  | ListChild<Required<Pick<ListContent, "children">>>
  | IBlock<Required<Pick<ListContent, "children">>>;

export type SpanContent = {
  type: SpanType;
  content: TextContent;
  id: string;
};

export enum SpanType {
  DEFAULT = "DEFAULT",
  BOLD = "BOLD",
  ITALIC = "ITALIC",
  UNDERLINE = "UNDERLINE",
  STRIKE = "STRIKE",
  LINK = "LINK",
  REFERENCE = "REFERENCE",
  CODE = "CODE",
  COLOR = "COLOR"
}

// export type BasicMarkdown = {
//   id: string;
//   blocks: Block[];
// };

export type IListOperation = {
  operation: "tab" | "shifttab";
  id: string;
  parentHierarchy: string[];
};

export type IBlockOperationContext = {
  source: string;
  blockType?: NodeType;
  listType?: ListType;
  body?: any;
};

export enum BlockAction {
  CONVERT = "convert",
  INSERT = "insert",
  MENTION = "mention",
  DELETE = "delete",
  MOVEUP = "moveup",
  MOVEDOWN = "movedown",
  LINK = "link",
  DUPLICATE = "duplicate",
  COPY_LINK = "COPY_LINK",
  INSERT_ABOVE = "INSERT_ABOVE",
  INSERT_BELOW = "INSERT_BELOW",
  COPY_BLOCK_TEXT = "COPY_BLOCK_TEXT",
  FOCUS = "FOCUS",
  OPEN_AS_SPLIT = "OPEN_AS_SPLIT",
  OPEN_IN_FULL_SCREEN = "OPEN_IN_FULL_SCREEN",
  OPEN_AS_TAB = "OPEN_AS_TAB",
  COLOR = "COLOR",
  CALLOUT_SETTINGS = "CALLOUT_SETTINGS",
  SHORTCUTS = "SHORTCUTS",
  DOWNLOAD = "DOWNLOAD",
  /**
   * Toggles whether to show preview or not for specific embed blocks like pdf, web page etc.
   */
  EMBED_PREVIEW_TOGGLE = "EMBED_PREVIEW_TOGGLE",

  /**
   * Content change event
   */
  CHANGE = "change"
}

export type IMarkdownSettings = IObservableStoreSubject & {
  callout: ICalloutSetting[];
};
export type ICalloutSetting = {
  id: string;
  avatar: IAvatar;
  color: number;
  label: string;
};
