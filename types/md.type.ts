import type { DbRecordBase } from "./dbrecord.type";

export type MdStore = {
  md: Markdown | undefined;
  blocks: Block[];
  focusedBlockId?: string;
  context: MdContext;
  params?: MdParams;
};

export type Block = {
  id: string;
  content: BlockContent;
  childrenHierarchy?: string[];
};

export type Markdown = {
  id: string;
  content: BlockContent;
  children?: Markdown[];
  childrenHierarchy?: string[];
};

export type DbBlock = DbRecordBase & Block;

export type BlockContent = TextContent | ListContent | StructuralContent;

export type ListContent = {
  type: BlockType.LIST;
  body: {
    type: ListType;
    content: string | TextContent;
  };
  children?: ListChild[];
};

export type ListChild = {
  order: number;
  id: string;
  content: BlockContent;
};

export type TextContent = {
  type: TextType;
  body: string; //| SpanContent[];
};

export type StructuralContent = {
  type: BlockType.DIVIDER | BlockType.DOUBLE_DIVIDER;
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
  COLOR = "COLOR",
}

export enum ListType {
  ORDERED = "ORDERED",
  UNORDERED = "UNORDERED",
}

export type TextType =
  | BlockType.SIMPLE_TEXT
  | BlockType.QUOTE
  | BlockType.CODE
  | BlockType.HEADING1
  | BlockType.HEADING2
  | BlockType.HEADING3
  | BlockType.HEADING4
  | BlockType.HEADING5;

export enum BlockType {
  HEADING1 = "HEADING1",
  HEADING2 = "HEADING2",
  HEADING3 = "HEADING3",
  HEADING4 = "HEADING4",
  HEADING5 = "HEADING5",
  SIMPLE_TEXT = "SIMEPLE_TEXT",
  QUOTE = "QUOTE",
  CODE = "CODE",
  LIST = "LIST",
  MARKDOWN = "MARKDOWN",
  DIVIDER = "DIVIDER",
  DOUBLE_DIVIDER = "DOUBLE_DIVIDER",
}

export enum MdContext {
  NODE = "NODE",
  BASIC = "BASIC",
}

export type MdParams = {
  placeholder?: string;
};

export enum BlockContext {
  DEFAULT = "DEFAULT",
  LIST_CHILD = "LIST_CHILD",
}
