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
import type { IResourceBase } from "../resourceStores/resource.type";

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
};
