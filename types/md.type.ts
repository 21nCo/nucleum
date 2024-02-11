import type { DbRecordBase } from "./dbrecord.type";

export type MdStore = {
  md: NodeMarkdown | undefined;
  blocks: Block[];
  blockToFocus?: string;
  context: MdContext;
  params?: MdParams;
};

export type Block = {
  id: string;
  content: BlockContent;
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
  children?: ListChild[];
};

export type ListChild = {
  id: string;
  content: BlockContent;
};

export type TextContent = {
  type: TextType;
  body: string; //| SpanContent[];
};

export type StructuralContent = {
  type: MdBlockType.DIVIDER | MdBlockType.DOUBLE_DIVIDER;
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
  UNORDERED = "UNORDERED"
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
  LIST = "LIST",
  MARKDOWN = "MARKDOWN",
  DIVIDER = "DIVIDER",
  DOUBLE_DIVIDER = "DOUBLE_DIVIDER"
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
