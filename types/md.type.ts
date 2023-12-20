import type { DbRecordBase } from "./dbrecord.type";

export type MdStore = {
  md: Markdown | undefined;
  blocks: Block[];
  focusedBlockId?: string;
};

export type Block = {
  id: string;
  type: BlockType;
  content: BlockContent;
};

export type Markdown = {
  id: string;
  type: BlockType;
  content: BlockContent;
  children: Markdown[];
};

export type DbBlock = DbRecordBase & {
  type: BlockType;
  content: BlockContent;
  children: string[];
};

export type BlockContent = TextContent | ListContent;

export type ListContent = {
  type: ListType;
  items: TextContent[];
};

export type TextContent = string | SpanContent[];

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

export enum BlockType {
  HEADING1 = "HEADING1",
  HEADING2 = "HEADING2",
  HEADING3 = "HEADING3",
  HEADING4 = "HEADING4",
  HEADING5 = "HEADING5",
  TEXT = "TEXT",
  QUOTE = "QUOTE",
  CODE = "CODE",
  LIST = "LIST",
  MARKDOWN = "MARKDOWN",
  DIVIDER = "DIVIDER",
}
