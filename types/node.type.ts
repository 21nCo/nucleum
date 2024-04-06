import type { DbRecordBase } from "$lib/tidy/types/dbrecord.type";
import type { Markdown } from "./md.type";

export type Node = NodeBase &
  NodeContent & {
    metadata: NodeMetadata;
    children?: Node[];
    childrenHierarchy?: string[];
    forelinks?: LinkThumbnail[];
  };

export type NodeCapture = Omit<NodeBase, "id"> &
  NodeContent & {
    metadata: NodeMetadataCapturedAtClient;
    links?: Link[];
  };

export type NodeDbType = Node & DbRecordBase;

export type NodeThumbnail = NodeBase &
  NodeContent & {
    created: string;
    links: LinkThumbnail[];
  };

export type NodeBase = {
  id: string;
  title?: string;
  generatedTitle?: string;
  avatar?: string;
};

export type ActiveNodeStore = Node & {};

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
  type: TextNodeType;
  body: string; //| SpanContent[];
};

export type ListContent = {
  type: NodeType.LIST;
  listType: ListType;
  body: string;
  children?: ListChild[];
};

export type ListChild<T = NodeContent> = T & {
  id: string;
  // content: T;
};

export type StructuralContent = {
  type: StructuralNodeType;
};

export type LayoutContent = {
  type: LayoutNodeType;
  body: any;
};

export type MediaContent = {
  type: MediaNodeType;
  body: MediaBody;
};

export type NonNodularMarkdownContent = {
  type: NodeType.NON_NODULAR_MARKDOWN;
  body: Markdown;
};

export type ClipContent = {
  type: ClipType;
  body: any;
};

//TODO - temp
export type OtherContent = {
  type: OtherNodeType;
  body: any;
};

export enum ListType {
  ORDERED = "ORDERED",
  UNORDERED = "UNORDERED",
  CHECKLIST = "CHECKLIST",
  TOGGLELIST = "TOGGLELIST"
}

export type TextNodeType =
  | NodeType.SIMPLE_TEXT
  | NodeType.QUOTE
  | NodeType.CODE
  | NodeType.HEADING1
  | NodeType.HEADING2
  | NodeType.HEADING3
  | NodeType.HEADING4
  | NodeType.HEADING5;

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
  | NodeType.WEBPAGE_CLIP
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
  SIMPLE_TEXT = "SIMEPLE_TEXT",
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
  WEBPAGE_CLIP = "WEBPAGE_CLIP",
  TEXT_CLIP = "TEXT_CLIP",
  IMAGE_CLIP = "IMAGE_CLIP",
  AUDIO_CLIP = "AUDIO_CLIP",
  VIDEO_CLIP = "VIDEO_CLIP",
  PDF_CLIP = "PDF_CLIP",
  VIDEO_TIMESTAMP_CLIP = "VIDEO_TIMESTAMP_CLIP"
}

export type MediaBody = {
  url: string;
  type: string;
  size: number;
};

export enum RightPanelType {
  NONE = "NONE",
  TOC = "TOC",
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

export type NodeMetadataCapturedAtClient = {
  location?: any;
};

export type NodeMetadata = NodeMetadataCapturedAtClient & {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};
