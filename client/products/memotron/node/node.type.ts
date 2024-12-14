import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import type { IAvatar } from "../../../types/avatar.type";
import type {
  IBlockBody,
  IMarkdown
} from "../../../components/markdown/md.type";
import type { IRecordId, IStore } from "../../../types/data.type";
import type {
  IProperty,
  IPropertyValue
} from "$lib/client/products/memotron/collection/properties/property.type";
import {
  ResourceAccessMode,
  type CaptureOmittedFields,
  type IActiveResource,
  type OmitFields,
  type OmitForCapture
} from "$lib/client/components/flux/resourceStores/resource.type";
import type { IFile } from "$lib/client/components/files/file.type";
import type {
  IActiveCollection,
  ICollectionExpanded
} from "../collection/collection.type";

export type INodeItemCaptured = OmitForCapture<INodeInterface> & {
  id: IRecordId;
};

/**
 * @deprecated - use {@link INodeThumb} instead
 */
export type INodeThumbnail = INodeBaseV1 &
  NodeContent & {
    links: LinkThumbnail[];
    children?: INodeThumbnail[];
  };

/**
 * @deprecated - use {@link INodeInterface} instead
 */
type INodeBaseV1 = IMemotronItemBase & {
  generatedLabel?: string;
  /**
   * @deprecated - avatar is dynamically resolved from typed collections
   */
  avatar?: IAvatar;
  properties?: INodePropertyValue[];
  parent?: string;
  creationContext?: string;
  notes?: string;
};

type INodeInterface<
  TType = NodeType,
  TBody = any,
  TMetadata = any
> = IMemotronItemBase & {
  body: TBody;
  contentType: TType;
  metadata?: TMetadata;
  properties?: INodePropertyValue[];
  parent?: IRecordId;
  /**
   * The context in which the node was created i.e. whether nodes like AUDIO or IMAGE or PDF created independantly or from within a markdown as block. Also, for clips, whether the parent is created independently or as a supplementary when a text clip or tweet is created.
   * This helps in determining what to show as individual items in library, resource browser or on a timeline and similar scenarios.
   *
   * Note: In context of search, all root nodes are shown irrespective of the context.
   *
   */
  creationContext?: IRecordId;
  notes?: string;
  url?: string;
  file?: IRecordId;
  /**
   * Calculated avatar from linked type collections
   */
  avatar?: IAvatar[];
  /**
   * @deprecated - use {@link text} instead
   */
  mdText?: string;
  text?: string;
  config?: any;
};

export type ILink = IMemotronItemBase & {
  id: IRecordId;
  in: IRecordId;
  out: IRecordId;
  linkType: LinkType;
};

/**
 * TODO - refactor similar to {@link IClip} to use {@link INodeInterface} instead
 */
export type NodeContent =
  | TextContent
  | ListContent
  | LayoutContent
  | NonNodularMarkdownContent
  | StructuralContent
  | OtherContent;

export type TextContent = {
  contentType: SimpleTextNodeType;
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

export type NonNodularMarkdownContent = {
  contentType: NodeType.NON_NODULAR_MARKDOWN;
  body: IMarkdown;
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

export type OtherNodeType =
  | NodeType.MATH
  | NodeType.CALLOUT
  | NodeType.LINK
  | NodeType.EMBED
  | NodeType.TABLE
  | NodeType.NODULAR_MARKDOWN
  | NodeType.COLLECTION_AS_EMBED;

export enum NodeType {
  UNKNOWN = "UNKNOWN",
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

  //List types
  LIST = "LIST",
  ORDERED_LIST = "ORDERED_LIST",
  CHECKLIST = "CHECKLIST",

  //MEDIA
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  PDF = "PDF",
  FILE = "FILE",
  SKETCH = "SKETCH",
  //EMBED
  EMBED = "EMBED",
  TOC = "TOC",
  NODE_AS_EMBED = "NODE_AS_EMBED",
  COLLECTION_AS_EMBED = "COLLECTION_AS_EMBED",
  GRAPH_AS_EMBED = "GRAPH_AS_EMBED",
  CALENDAR_AS_EMBED = "CALENDAR_AS_EMBED",
  TREE_OF_LINKS = "TREE_OF_LINKS",

  //LAYOUT
  DIVIDER = "DIVIDER",
  DOUBLE_DIVIDER = "DOUBLE_DIVIDER",
  TABLE = "TABLE",
  MEDIA_STACK = "MEDIA_STACK",
  MEDIA_GRID = "MEDIA_GRID",
  COLUMNS = "COLUMNS",
  TABS = "TABS",
  GRID = "GRID",
  ACCORDION = "ACCORDION",

  //CLIPS
  WEB_PAGE = "WEB_PAGE",
  TEXT_CLIP = "TEXT_CLIP",
  IMAGE_CLIP = "IMAGE_CLIP",
  AUDIO_CLIP = "AUDIO_CLIP",
  VIDEO_CLIP = "VIDEO_CLIP",
  PDF_CLIP = "PDF_CLIP",
  WEB_SCREENSHOT_CLIP = "WEB_SCREENSHOT_CLIP",

  //EXTERNAL
  KINDLE_BOOK = "KINDLE_BOOK",
  KINDLE_HIGHLIGHT = "KINDLE_HIGHLIGHT",
  TWEET = "TWEET",
  TWITTER_PROFILE = "TWITTER_PROFILE",
  REDDIT_THREAD = "REDDIT_THREAD",
  DISCORD_THREAD = "DISCORD_THREAD",
  YOUTUBE_VIDEO = "YOUTUBE_VIDEO",
  YOUTUBE_TIMESTAMP_CLIP = "YOUTUBE_TIMESTAMP_CLIP",
  YOUTUBE_CHANNEL = "YOUTUBE_CHANNEL",
  TED_VIDEO = "TED_VIDEO",
  INSTAGRAM_POST = "INSTAGRAM_POST",
  FACEBOOK_POST = "FACEBOOK_POST",
  TWITCH_STREAM = "TWITCH_STREAM",
  STACKOVERFLOW_THREAD = "STACKOVERFLOW_THREAD",
  GITHUB_REPO = "GITHUB_REPO",
  GITHUB_PROFILE = "GITHUB_PROFILE",
  GITHUB_DISCUSSION = "GITHUB_DISCUSSION",
  GITLAB_PROJECT = "GITLAB_PROJECT"
}

export const headingNodeTypes = [
  NodeType.HEADING1,
  NodeType.HEADING2,
  NodeType.HEADING3,
  NodeType.HEADING4,
  NodeType.HEADING5
];

export const canHaveTraces = [
  NodeType.NODULAR_MARKDOWN,
  NodeType.PDF,
  NodeType.WEB_PAGE,
  NodeType.TWITTER_PROFILE,
  NodeType.YOUTUBE_VIDEO,
  NodeType.YOUTUBE_CHANNEL,
  NodeType.KINDLE_BOOK
];

export const structuralNodeTypes = [
  NodeType.DIVIDER,
  NodeType.DOUBLE_DIVIDER,
  NodeType.TOC
];

export const simpleTextNodeTypeList = [NodeType.SIMPLE_TEXT, NodeType.QUOTE];

export const listNodeTypes = [
  NodeType.LIST,
  NodeType.ORDERED_LIST,
  NodeType.CHECKLIST
];

export const nonSimpleTextNodeTypeList = [
  NodeType.CODE,
  NodeType.CALLOUT,
  ...listNodeTypes
];

export const internalUrlNodeTypeList = [
  NodeType.IMAGE,
  NodeType.VIDEO,
  NodeType.AUDIO,
  NodeType.PDF
];

export const embedNodeTypeList = [
  NodeType.NODE_AS_EMBED,
  NodeType.COLLECTION_AS_EMBED,
  NodeType.GRAPH_AS_EMBED,
  NodeType.CALENDAR_AS_EMBED,
  NodeType.TOC
];

export type SimpleTextNodeType =
  | NodeType.SIMPLE_TEXT
  | NodeType.QUOTE
  | NodeType.HEADING1
  | NodeType.HEADING2
  | NodeType.HEADING3
  | NodeType.HEADING4
  | NodeType.HEADING5;

export type ListNodeType =
  | NodeType.LIST
  | NodeType.ORDERED_LIST
  | NodeType.CHECKLIST;

export enum NodeRightPaneType {
  NONE = "NONE",
  OUTLINE = "OUTLINE",
  PROPERTIES = "PROPERTIES",
  TRACES = "TRACES",
  SIDENOTES = "SIDENOTES",
  METADATA = "METADATA",
  LINKS = "LINKS",
  /**
   * @deprecated - merged into traces
   */
  MENTIONS = "MENTIONS",
  HISTORY = "HISTORY",
  /**
   * @deprecated - will be shown as main panel
   */
  SERENDIPITY = "SERENDIPITY"
}

type INodeLinkBase = {
  linkType: LinkType;
  /**
   * Link tags
   */
  tags?: IRecordId[];
};

export type INodeLink = IMemotronItemBase &
  INodeLinkBase & {
    in: IRecordId;
    out: IRecordId;
  };

export type INodeLinkThumb = INodeLinkBase & {
  id: IRecordId;
  linkedTo: IRecordId;
  direction: "incoming" | "outgoing";
};

export type LinkThumbnail = INodeLink & {
  title: string;
  icon: string;
};

export enum LinkType {
  DIRECT = "DIRECT",
  MENTION = "MENTION",
  SUGGESTION = "SUGGESTION"
}

export type INodeMetadata = { location?: any };

export type INodePropertyValue = {
  id: IRecordId;
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
  id: IRecordId;
  /**
   * Hierarchy factor to determine the nesting of the blocks in nodular markdown
   * Ex: Heading 1 -> 1
   *    Heading 2 -> 2
   */
  factor: number;
  children: IRecordId[];
};

type INodeHasUrl = {
  url: string;
};

type INodeHasParent = {
  parent: IRecordId;
};

type INodeHasText = {
  text: string;
};

type INodeHasLabel = {
  label: string;
};

// ===== Media node types =====

export const mediaNodeTypeList = [
  NodeType.IMAGE,
  NodeType.VIDEO,
  NodeType.AUDIO,
  NodeType.PDF,
  NodeType.FILE
];

type MediaNodeType =
  | NodeType.IMAGE
  | NodeType.VIDEO
  | NodeType.AUDIO
  | NodeType.PDF
  | NodeType.FILE;

export type IMediaNode = INodeInterface<MediaNodeType, any, INodeMetadata> & {
  file: IRecordId;
};

// ===== Layout node types =====

export type IMediaGridItem = {
  id: string;
  file: IRecordId;
  position: {
    auto: number;
    columns: {
      index: number;
      columnNo: number;
    };
  };
};

export enum MediaGridType {
  AUTO = "AUTO",
  COLUMNS = "COLUMNS"
}

export type IMediaGridBody = {
  items: IMediaGridItem[];
  type: MediaGridType;
  gap: number;
  altText: string;
  noOfColumns: number;
  isWideLayout: boolean;
};

export type IMediaGridNode = INodeInterface<
  NodeType.MEDIA_GRID,
  IMediaGridBody,
  INodeMetadata
>;

// ===== Web node types =====

/**
 * Web node types with body.url present.
 */
export const webNodeTypeList = [
  NodeType.WEB_PAGE,
  NodeType.TEXT_CLIP,
  NodeType.IMAGE_CLIP,
  NodeType.AUDIO_CLIP,
  NodeType.VIDEO_CLIP,
  NodeType.WEB_SCREENSHOT_CLIP,

  NodeType.YOUTUBE_VIDEO,
  NodeType.YOUTUBE_CHANNEL,
  NodeType.YOUTUBE_TIMESTAMP_CLIP,
  NodeType.TWEET,
  NodeType.TWITTER_PROFILE,
  NodeType.KINDLE_BOOK,
  NodeType.KINDLE_HIGHLIGHT
];

type IGenericWebPageBody = {
  hash: string;
  description?: string;
};
export type IGenericWebPage = INodeInterface<
  NodeType.WEB_PAGE,
  IGenericWebPageBody,
  IWebPageMetadata
> &
  INodeHasUrl &
  INodeHasLabel;

type IWebPageMetadata = {
  favicon?: string;
  faviconLink?: string;
  appIconLinks?: string[];
  keywords?: string;
  hostname?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: string;
  screenshotFile?: IRecordId;
};

export type ITextClipBody = {
  /**
   * @deprecated - use text field of node instead
   */
  text: string;
  highlighterId: string;
  pre?: string;
  post?: string;
};
type ITextClipMetadata = {
  container: string;
  anchorNode: string;
  focusNode: string;
  anchorOffset: number;
  focusOffset: number;
};
export type ITextClip = INodeInterface<
  NodeType.TEXT_CLIP,
  ITextClipBody,
  ITextClipMetadata
> &
  INodeHasUrl &
  INodeHasText &
  INodeHasParent;

export type IVideoTimestampClipBody = {
  timestamp: number;
  /**
   * The thumbnail of the video. - file id
   */
  thumbnail?: IRecordId;
  /**
   * @deprecated - use thumbnail instead
   */
  s3Url?: string;
};
export type IVideoTimestampClip = INodeInterface<
  NodeType.YOUTUBE_TIMESTAMP_CLIP,
  IVideoTimestampClipBody,
  any
> &
  INodeHasParent;

export type IYoutubeChannelBody = {
  /**
   * @deprecated - use label field of node instead
   */
  title: string;
  description?: string;
  channelImageUrl?: string;
};
export type IYoutubeChannelMetadata = IWebPageMetadata & {
  externalLinks?: string[];
};
export type IYoutubeChannel = INodeInterface<
  NodeType.YOUTUBE_CHANNEL,
  IYoutubeChannelBody,
  IYoutubeChannelMetadata
> &
  INodeHasUrl &
  INodeHasLabel;

type IYoutubeVideoBody = {
  title: string;
  description?: string;
  /**
   * The thumbnail of the video. - file id
   */
  thumbnail?: IRecordId;
  /**
   * @deprecated - use thumbnail instead
   */
  s3Url?: string;
};
type IYoutubeVideoMetadata = IWebPageMetadata & {
  popularity?: number;
};
export type IYoutubeVideo = INodeInterface<
  NodeType.YOUTUBE_VIDEO,
  IYoutubeVideoBody,
  IYoutubeVideoMetadata
> &
  INodeHasUrl &
  INodeHasLabel;

type IWebScreenshotClipBody = {
  /**
   * The file id
   */
  file: IRecordId;
  /**
   * @deprecated - use file instead
   */
  s3Url?: string;
};
export type IWebScreenshotClip = INodeInterface<
  NodeType.WEB_SCREENSHOT_CLIP,
  IWebScreenshotClipBody,
  any
>;

type IMultimediaClipBody = {
  /**
   * file id
   */
  file: IRecordId;
  /**
   * @deprecated - use file instead
   */
  s3Url: string;
  color: string;
};
export type IMultimediaClip = INodeInterface<
  NodeType.IMAGE_CLIP,
  IMultimediaClipBody,
  any
>;

type ITweetBody = {
  /**
   * @deprecated - use text field of node instead
   */
  content: string;
  postedAt: string;
};
type ITweetMetadata = IWebPageMetadata & {
  tweetId?: string;
  media?: string[];
  externalLinks?: string[];
  replyTo?: string;
};
export type ITweet = INodeInterface<
  NodeType.TWEET,
  ITweetBody,
  ITweetMetadata
> &
  INodeHasUrl &
  INodeHasParent &
  INodeHasText;

export type ITwitterProfileBody = {
  /**
   * @deprecated - use label field of node instead
   */
  name: string;
  bio?: string;
  profileImageUrl: string;
};
export type ITwitterProfileMetadata = IWebPageMetadata & {
  bioLink?: string;
  bioLinkText?: string;
};
export type ITwitterProfile = INodeInterface<
  NodeType.TWITTER_PROFILE,
  ITwitterProfileBody,
  ITwitterProfileMetadata
> &
  INodeHasUrl &
  INodeHasLabel;

export type IKindleBookBody = {
  id: string;
  author: string;
  asin?: string;
  imageUrl?: string;
  lastAnnotatedDate?: Date;
};
export type IKindleBook = INodeInterface<
  NodeType.KINDLE_BOOK,
  IKindleBookBody,
  IWebPageMetadata
> &
  INodeHasUrl &
  INodeHasLabel;

export type IKindleHighlightBody = {
  id: string;
  /**
   * @deprecated - use text field of node instead
   */
  text: string;
  location?: string;
  page?: string;
  note?: string;
  color?: "pink" | "blue" | "yellow" | "orange";
  createdDate?: Date;
};
export type IKindleHighlight = INodeInterface<
  NodeType.KINDLE_HIGHLIGHT,
  IKindleHighlightBody,
  IWebPageMetadata
> &
  INodeHasParent &
  INodeHasText;

export type IClip =
  | ITweet
  | IMultimediaClip
  | IVideoTimestampClip
  | ITextClip
  | IWebScreenshotClip
  | IKindleHighlight;

export type IWebPage =
  | IGenericWebPage
  | IYoutubeChannel
  | IYoutubeVideo
  | ITwitterProfile
  | IKindleBook;

export type INodeBody =
  | IBlockBody
  | IMarkdown
  | ITweetBody
  | ITwitterProfileBody
  | IMultimediaClipBody
  | IVideoTimestampClipBody
  | ITextClipBody
  | IWebScreenshotClipBody
  | IKindleHighlightBody;

export type IClipCapture = OmitFields<
  IClip,
  CaptureOmittedFields | "label" | "url" | "parent"
>;

export enum NodeIdPrefix {
  TWITTER_PROFILE = "twitterProfile",
  TWEET = "tweet"
}

/**
 * List of root node types that are shown in the library, resource browser and similar contexts.
 *
 * In context of search, all root nodes are shown along with heading nodes irrespective of the creationContext. In all other places, root nodes with creationContext i.e. nodes created as sub blocks or as supplement will be ignored.
 *
 * Examples for supplements: Twitter profile being saved as supplement when a tweet is clipped. A web page being saved as supplement when a text clip is clipped. A twitter profile or web page can separately be saved without any creationContext i.e. when saving by clicking on clipper tool bar.
 *
 * Supplements are not shown directly in the library, resource browser or timeline to avoid confusion as these are auto created and user might find it confusing to see them. On the other hand, supplements are shown in search results because these supplements are interactable from creationContext page. If the user can click on link to supplement and interact with it from a text clip page or a tweet page, user would expect to go back anytime to the supplement page.
 *
 * Note: Clips belonging to the same parent might be grouped together in places like Timeline. In this case, the supplement (i.e. the parent) is what's shown.
 *
 */
export const rootNodeTypeList = [
  NodeType.NODULAR_MARKDOWN,
  NodeType.NON_NODULAR_MARKDOWN,
  NodeType.PDF,
  NodeType.IMAGE,
  NodeType.VIDEO,
  NodeType.AUDIO,

  ...webNodeTypeList
];

export type INode =
  | INodeInterface<NodeType, NodeContent, INodeMetadata>
  | IMediaNode
  | IWebPage
  | IClip;

export type IActiveNode = INode &
  IActiveResource & {
    md: IMarkdown;
    parent?: INode;
    file?: IFile;
    mdParent?: IRecordId[];
    accessMode: ResourceAccessMode;
    focusedBlock?: IRecordId;
    collections?: IRecordId[];
    types?: ICollectionExpanded[];
    wordCount?: number;
    pdfAnnotations?: any[];
    links?: INodeLinkThumb[];
    children?: IActiveNode[];
    childrenHierarchy?: IRecordId[];
    blocks?: INode[];
    forelinks?: LinkThumbnail[];
  };

export type INodeThumb = INode & {
  file?: IFile;
  parent?: INode;
  mdParent?: IRecordId[];
  bodySearch?: string;
  labelSearch?: string;
};

export enum NodeView {
  CONTENT = "content",
  BIRD_VIEW = "birdView"
}
