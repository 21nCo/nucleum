import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import type { IAvatar } from "../../../types/avatar.type";
import type { IMarkdown } from "../../../components/markdown/md.type";
import type { IStore } from "../../../types/data.type";
import type {
  IProperty,
  IPropertyValue
} from "$lib/client/products/memotron/collection/properties/property.type";
import type { ILink } from "../capture/capture.type";

export type INode = INodeBase &
  NodeContent & {
    metadata: INodeMetadata;
    children?: INode[] | string[];
    childrenHierarchy?: string[];
    forelinks?: LinkThumbnail[];
  };

export type INodeItemCaptured = Omit<
  INodeBase,
  "createdAt" | "modifiedAt" | "createdBy" | "modifiedBy"
> &
  NodeContent & {
    children?: string[];
    /**
     * The context in which the node was created i.e. whether nodes like AUDIO or IMAGE or PDF created independantly or from within a markdown as block.
     * This helps in determining what to show as items on a timeline etc.
     */
    creationContext?: string;
    metadata?: INodeMetadata;
    links?: ILink[];
  };

export type INodeThumbnail = INodeBase &
  NodeContent & {
    links: LinkThumbnail[];
    children?: INodeThumbnail[];
  };

export type INodeBase = IMemotronItemBase & {
  generatedLabel?: string;
  avatar?: IAvatar;
  properties?: INodeProperty[];
};

export type IActiveNode = INode & {
  md: IMarkdown;
  parent?: string[];
  focusedBlock?: string;
  collections?: string[];
  types?: string[];
  propertyConfig?: IProperty[];
};

export type NodeContent =
  | TextContent
  | ListContent
  | LayoutContent
  | MediaContent
  | ClipContent
  | NonNodularMarkdownContent
  | StructuralContent
  | OtherContent;

export type TextContent = {
  contentType: TextNodeType;
  body: string; //| SpanContent[];
};

export type ListContent = {
  contentType: NodeType.LIST;
  listType: ListType;
  body: string;
  children?: ListChild[];
};

export type ListChild<T = NodeContent> = T & {
  id: string;
  // content: T;
};

export type StructuralContent = {
  contentType: StructuralNodeType;
};

export type LayoutContent = {
  contentType: LayoutNodeType;
  body: any;
};

export type MediaContent = {
  contentType: MediaNodeType;
  body: MediaBody;
};

export type NonNodularMarkdownContent = {
  contentType: NodeType.NON_NODULAR_MARKDOWN;
  body: IMarkdown;
};

export type ClipContent = {
  contentType: ClipType;
  body: any;
};

//TODO - temp
export type OtherContent = {
  contentType: OtherNodeType;
  body: any;
};

export enum ListType {
  ORDERED = "ORDERED",
  UNORDERED = "UNORDERED",
  CHECKLIST = "CHECKLIST",
  TOGGLELIST = "TOGGLELIST"
}

export type LayoutNodeType =
  | NodeType.GRID
  | NodeType.COLUMNS
  | NodeType.TABS
  | NodeType.ACCORDION
  | NodeType.MEDIA_GRID
  | NodeType.MEDIA_STACK;

export type StructuralNodeType =
  | NodeType.DIVIDER
  | NodeType.DOUBLE_DIVIDER
  | NodeType.TOC;

export type MediaNodeType =
  | NodeType.IMAGE
  | NodeType.AUDIO
  | NodeType.VIDEO
  | NodeType.PDF
  | NodeType.FILE;

export type OtherNodeType =
  | NodeType.MATH
  | NodeType.CALLOUT
  | NodeType.LINK
  | NodeType.EMBED
  | NodeType.TABLE
  | NodeType.NODULAR_MARKDOWN
  | NodeType.COLLECTION_AS_EMBED;

export type ClipType =
  | NodeType.WEBPAGE
  | NodeType.TEXT_CLIP
  | NodeType.IMAGE_CLIP
  | NodeType.AUDIO_CLIP
  | NodeType.VIDEO_CLIP
  | NodeType.PDF_CLIP
  | NodeType.VIDEO_TIMESTAMP_CLIP;

export enum NodeType {
  NODULAR_MARKDOWN = "NODULAR_MARKDOWN",
  NON_NODULAR_MARKDOWN = "NON_NODULAR_MARKDOWN",

  //TEXT
  HEADING1 = "HEADING1",
  HEADING2 = "HEADING2",
  HEADING3 = "HEADING3",
  HEADING4 = "HEADING4",
  HEADING5 = "HEADING5",
  SIMPLE_TEXT = "SIMPLE_TEXT",
  QUOTE = "QUOTE",
  CODE = "CODE",
  MATH = "MATH",
  CALLOUT = "CALLOUT",
  LINK = "LINK",
  LIST = "LIST",

  //MEDIA
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  PDF = "PDF",
  FILE = "FILE",

  EMBED = "EMBED",
  DIVIDER = "DIVIDER",
  DOUBLE_DIVIDER = "DOUBLE_DIVIDER",
  TOC = "TOC",
  COLLECTION_AS_EMBED = "COLLECTION_AS_EMBED",

  //LAYOUT
  TABLE = "TABLE",
  MEDIA_STACK = "MEDIA_STACK",
  MEDIA_GRID = "MEDIA_GRID",
  COLUMNS = "COLUMNS",
  TABS = "TABS",
  GRID = "GRID",
  ACCORDION = "ACCORDION",

  //CLIPS
  WEBPAGE = "WEBPAGE",
  TEXT_CLIP = "TEXT_CLIP",
  IMAGE_CLIP = "IMAGE_CLIP",
  AUDIO_CLIP = "AUDIO_CLIP",
  VIDEO_CLIP = "VIDEO_CLIP",
  PDF_CLIP = "PDF_CLIP",
  VIDEO_TIMESTAMP_CLIP = "VIDEO_TIMESTAMP_CLIP"
}

export const ClipNodeTypeList = [
  NodeType.WEBPAGE,
  NodeType.TEXT_CLIP,
  NodeType.IMAGE_CLIP,
  NodeType.AUDIO_CLIP,
  NodeType.VIDEO_CLIP,
  NodeType.PDF_CLIP,
  NodeType.VIDEO_TIMESTAMP_CLIP
];
export const headingNodeTypes = [
  NodeType.HEADING1,
  NodeType.HEADING2,
  NodeType.HEADING3,
  NodeType.HEADING4,
  NodeType.HEADING5
];
export const TextNodeTypeList = [
  NodeType.SIMPLE_TEXT,
  NodeType.QUOTE,
  NodeType.CODE,
  ...headingNodeTypes
];

export type TextNodeType =
  | NodeType.SIMPLE_TEXT
  | NodeType.QUOTE
  | NodeType.CODE
  | NodeType.HEADING1
  | NodeType.HEADING2
  | NodeType.HEADING3
  | NodeType.HEADING4
  | NodeType.HEADING5;

export type MediaBody = {
  url: string;
  type: string;
  size: number;
};

export enum RightPanelType {
  NONE = "NONE",
  OUTLINE = "OUTLINE",
  PROPERTIES = "PROPERTIES",
  TRACES = "TRACES",
  METADATA = "METADATA",
  FORELINKS = "FORELINKS",
  MENTIONS = "MENTIONS",
  HISTORY = "HISTORY",
  SERENDIPITY = "SERENDIPITY"
}

export type Link = {
  id: string;
  linkType: LinkType;
};

export type LinkThumbnail = Link & {
  title: string;
  icon: string;
};

export enum LinkType {
  DIRECT = "DIRECT",
  MENTION = "MENTION",
  UNMENTION_APPEARANCE = "UNMENTION_APPEARANCE"
}

export type INodeMetadata = {
  location?: any;
};

export type INodeProperty = {
  id: string;
  value: IPropertyValue | null;
};

export enum NodeThumbnailVariant {
  LIST = "LIST",
  GRID = "GRID",
  TIMELINE = "TIMELINE"
}

export interface INodeStore extends IStore {}

export type INodeHierarchyV1 = {
  id: string;
  factor: number;
  children: INodeHierarchyV1[];
};

export type INodeStructure = {
  id: string;
  /**
   * Hierarchy factor to determine the nesting of the blocks in nodular markdown
   * Ex: Heading 1 -> 1
   *    Heading 2 -> 2
   */
  factor: number;
  children: string[];
};
