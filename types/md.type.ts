import type { DbRecordBase } from "./dbrecord.type";

export type MdStore = {
  md: NodeMarkdown | undefined;
  blocks: Block[];
  blockToFocus?: string;
  reRenderBlock?: string;
  context: MdContext;
  params?: MdParams;
};

export type Block<T = BlockContent> = {
  id: string;
  content: T;
  childrenHierarchy?: string[];
};

export type NodeMarkdown = {
  id: string;
  content: BlockContent;
  children?: NodeMarkdown[];
  childrenHierarchy?: string[];
};

export type BasicMarkdown = {
  id: string;
  blocks: Block[];
};

export type DbBlock = DbRecordBase & Block;

export type BlockContent = TextContent | ListContent | StructuralContent;

export type ListContent = {
  type: MdBlockType.LIST;
  body: {
    type: ListType;
    content: string | TextContent;
  };
  children?: ListChild<BlockContent>[];
};

export type ListChild<T = BlockContent> = {
  id: string;
  content: T;
};

export type TextContent = {
  type: TextType;
  body: string; //| SpanContent[];
};

export type StructuralContent = {
  type: MdBlockType.DIVIDER | MdBlockType.DOUBLE_DIVIDER;
};

export type LayoutContent = {
  type:
    | MdBlockType.GRID
    | MdBlockType.COLUMNS
    | MdBlockType.TABS
    | MdBlockType.ACCORDION;
};

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

export enum ListType {
  ORDERED = "ORDERED",
  UNORDERED = "UNORDERED",
  CHECKLIST = "CHECKLIST",
  TOGGLELIST = "TOGGLELIST"
}

export type TextType =
  | MdBlockType.SIMPLE_TEXT
  | MdBlockType.QUOTE
  | MdBlockType.CODE
  | MdBlockType.HEADING1
  | MdBlockType.HEADING2
  | MdBlockType.HEADING3
  | MdBlockType.HEADING4
  | MdBlockType.HEADING5;

export enum MdBlockType {
  HEADING1 = "HEADING1",
  HEADING2 = "HEADING2",
  HEADING3 = "HEADING3",
  HEADING4 = "HEADING4",
  HEADING5 = "HEADING5",
  SIMPLE_TEXT = "SIMEPLE_TEXT",
  QUOTE = "QUOTE",
  CODE = "CODE",
  MATH = "MATH",
  CALLOUT = "CALLOUT",
  LINK = "LINK",
  LIST = "LIST",
  IMAGE = "IMAGE",
  MEDIA_STACK = "IMAGE_STACK",
  MEDIA_GRID = "IMAGE_GRID",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  PDF = "PDF",
  FILE = "FILE",
  EMBED = "EMBED",
  TABLE = "TABLE",
  MARKDOWN = "MARKDOWN",
  DIVIDER = "DIVIDER",
  DOUBLE_DIVIDER = "DOUBLE_DIVIDER",
  COLUMNS = "COLUMNS",
  TABS = "TABS",
  GRID = "GRID",
  ACCORDION = "ACCORDION",
  TOC = "TOC",
  COLLECTION_AS_EMBED = "COLLECTION_AS_EMBED"
}
export enum InlineType {
  MENTION = "MENTION",
  DATE = "DATE",
  CODE = "CODE",
  BOLD = "BOLD",
  ITALIC = "ITALIC",
  UNDERLINE = "UNDERLINE",
  STRIKE = "STRIKE",
  SUBSCRIPT = "SUBSCRIPT",
  SUPERSCRIPT = "SUPERSCRIPT"
}

export enum MdContext {
  NODE = "NODE",
  BASIC = "BASIC"
}

export type MdParams = {
  placeholder?: string;
  actions?: string[];
  isReadOnly?: boolean;
  title?: string;
};

export enum BlockContext {
  DEFAULT = "DEFAULT",
  LIST_CHILD = "LIST_CHILD"
}

export type ListBlockWithChildren =
  | ListChild<Required<Pick<ListContent, "children">>>
  | Block<Required<Pick<ListContent, "children">>>;
