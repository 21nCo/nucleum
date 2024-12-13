import type { IAvatar } from "$lib/client/types/avatar.type";
import type {
  IObservableStoreSubject,
  IRecordId
} from "$lib/client/types/data.type";
import type {
  ListChild,
  ListContent,
  TextContent,
  NodeType,
  ListType,
  SimpleTextNodeType,
  ListNodeType
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
export type DbBlock = IResourceBase & IBlockInterface;

export type IBlockInterface<TType = NodeType, TBody = IBlockBody> = {
  id: IRecordId;
  body: TBody;
  contentType: TType;
  /**
   * label will be present if heading nodes
   */
  label?: string;
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

/**
 * @deprecated
 */
export enum BlockContext {
  DEFAULT = "DEFAULT",
  LIST_CHILD = "LIST_CHILD"
}

/**
 * @deprecated - use {@link IBlockInterface} instead
 */
export type ListBlockWithChildren =
  | ListChild<Required<Pick<ListContent, "children">>>
  | IBlockInterface<Required<Pick<ListContent, "children">>>;

/**
 * @deprecated - use {@link TextContent} instead
 */
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
  source: IRecordId;
  blockType?: NodeType;
  /**
   * @deprecated - use {@link IListBlockBody} instead
   */
  listType?: ListType;
  body?: any;
};

export enum BlockAction {
  CONVERT = "convert",
  INSERT = "insert",
  INSERT_MANY = "insert_many",
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
  CHANGE = "change",
  TAB = "tab",
  SHIFT_TAB = "shifttab",
  /**
   * Triggered when backspace is pressed with content in the block and at the start of the block
   */
  BACKSPACE_WITH_CONTENT = "BACKSPACE_WITH_CONTENT",
  PASTE = "paste"
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

export type IEmbedBlockBody = {
  /**
   * Id of the media node that is embedded.
   */
  id?: IRecordId;
  subType?: NodeType;
  isHidePreview?: boolean;
  height?: number;
  /**
   * If direct url embed
   */
  url?: string;
};

export type ICalloutBody = {
  text: string;
  callout?: ICalloutSetting;
};

export type ICodeBlockBody = {
  text: string;
  language?: string;
};

export type IListBlockBody = {
  text: string;
  indent: number;
  checked?: boolean;
  order?: number;
};

export type INonSimpleTextBlockBody =
  | ICodeBlockBody
  | IListBlockBody
  | ICalloutBody;

export type IBlockBody = INonSimpleTextBlockBody | IEmbedBlockBody | string;

export type ISimpleTextBlock = IBlockInterface<SimpleTextNodeType, string>;
export type IDividerBlock = IBlockInterface<NodeType.DIVIDER>;
export type IDoubleDividerBlock = IBlockInterface<NodeType.DOUBLE_DIVIDER>;
export type IMediaGridBlock = IBlockInterface<NodeType.MEDIA_GRID>;
export type IEmbedBlock = IBlockInterface<NodeType.EMBED, IEmbedBlockBody>;
export type IListBlock = IBlockInterface<ListNodeType, IListBlockBody>;
export type ICodeBlock = IBlockInterface<NodeType.CODE, ICodeBlockBody>;
export type ICalloutBlock = IBlockInterface<NodeType.CALLOUT, ICalloutBody>;

export type IBlock =
  | IEmbedBlock
  | IListBlock
  | ICodeBlock
  | ICalloutBlock
  | IDividerBlock
  | IDoubleDividerBlock
  | IMediaGridBlock
  | ISimpleTextBlock;
