import type { DbRecordBase } from "../dbrecord.type";
import type {
  NodeContent,
  ListChild,
  ListContent,
  Node,
  TextContent
} from "./node.type";

export type MdStore = Markdown & {
  node?: Node;
  blockToFocus?: string;
  reRenderBlock?: string;
  params?: MdParams;
};
export type Markdown = {
  blocks: Block[];
};
export type DbBlock = DbRecordBase & Block;

export type Block<T = NodeContent> = T & {
  id: string;
  childrenHierarchy?: string[];
};
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

export type MdParams = {
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
  | Block<Required<Pick<ListContent, "children">>>;

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
