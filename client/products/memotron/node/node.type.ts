import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import type { IAvatar } from "../../../types/avatar.type";
import type { IMarkdown } from "../../../components/markdown/md.type";
import type { IStore } from "../../../types/data.type";
import type {
  IProperty,
  IPropertyValue
} from "$lib/client/products/memotron/collection/properties/property.type";
import {
  ResourceAccessMode,
  type IResourceCapture
} from "$lib/client/components/resourceStores/resource.type";

export type INode = (
  | INodeInterface<NodeType, NodeContent, INodeMetadata>
  | IClip
) & {
  children?: INode[] | string[];
  childrenHierarchy?: string[];
  forelinks?: LinkThumbnail[];
};

export type INodeItemCaptured = IResourceCapture<INodeInterface> & {
  id: string;
};

export type INodeThumbnail = INodeBase &
  NodeContent & {
    links: LinkThumbnail[];
    children?: INodeThumbnail[];
  };

export type INodeBase = IMemotronItemBase & {
  generatedLabel?: string;
  /**
   * @deprecated - avatar is dynamically resolved from typed collections
   */
  avatar?: IAvatar;
  properties?: INodeProperty[];
  parent?: string;
  /**
   * The context in which the node was created i.e. whether nodes like AUDIO or IMAGE or PDF created independantly or from within a markdown as block. Also, for clips, whether the parent is created independently or as a supplementary when a text clip or tweet is created.
   * This helps in determining what to show as individual items in library, resource browser or on a timeline and similar scenarios.
   *
   * Note: In context of search, all root nodes are shown irrespective of the context.
   *
   */
  creationContext?: string;
  notes?: string;
};

type INodeInterface<
  TType = NodeType,
  TBody = any,
  TMetadata = any
> = INodeBase & {
  body: TBody;
  contentType: TType;
  metadata?: TMetadata;
};

export type IActiveNode = INode & {
  md: IMarkdown;
  parent?: string[];
  accessMode: ResourceAccessMode;
  focusedBlock?: string;
  collections?: string[];
  types?: string[];
  avatars?: IAvatar[];
  propertyConfig?: IProperty[];
  wordCount?: number;
};

/**
 * TODO - refactor similar to {@link IClip} to use {@link INodeInterface} instead
 */
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

/**
 * @deprecated - use {@link IClip} instead
 */
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
  | NodeType.WEB_PAGE
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
  WEB_PAGE = "WEB_PAGE",
  TEXT_CLIP = "TEXT_CLIP",
  IMAGE_CLIP = "IMAGE_CLIP",
  AUDIO_CLIP = "AUDIO_CLIP",
  VIDEO_CLIP = "VIDEO_CLIP",
  PDF_CLIP = "PDF_CLIP",
  VIDEO_TIMESTAMP_CLIP = "VIDEO_TIMESTAMP_CLIP",
  WEB_SCREENSHOT_CLIP = "WEB_SCREENSHOT_CLIP",

  //EXTERNAL
  KINDLE_BOOK = "KINDLE_BOOK",
  KINDLE_HIGHLIGHT = "KINDLE_HIGHLIGHT",
  TWEET = "TWEET",
  TWITTER_PROFILE = "TWITTER_PROFILE",
  REDDIT_THREAD = "REDDIT_THREAD",
  DISCORD_THREAD = "DISCORD_THREAD",
  YOUTUBE_VIDEO = "YOUTUBE_VIDEO",
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

/**
 * Web node types with body.url present.
 */
export const webNodeTypeList = [
  NodeType.WEB_PAGE,
  NodeType.TEXT_CLIP,
  NodeType.IMAGE_CLIP,
  NodeType.AUDIO_CLIP,
  NodeType.VIDEO_CLIP,
  NodeType.PDF_CLIP,
  NodeType.VIDEO_TIMESTAMP_CLIP,
  NodeType.WEB_SCREENSHOT_CLIP,

  NodeType.TWEET,
  NodeType.TWITTER_PROFILE,
  NodeType.KINDLE_BOOK,
  NodeType.KINDLE_HIGHLIGHT
];

export const mediaNodeTypeList = [
  NodeType.IMAGE,
  NodeType.VIDEO,
  NodeType.AUDIO
];

export const headingNodeTypes = [
  NodeType.HEADING1,
  NodeType.HEADING2,
  NodeType.HEADING3,
  NodeType.HEADING4,
  NodeType.HEADING5
];

export const structuralNodeTypes = [
  NodeType.DIVIDER,
  NodeType.DOUBLE_DIVIDER,
  NodeType.TOC
];

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

export const TextNodeTypeList = [
  NodeType.SIMPLE_TEXT,
  NodeType.QUOTE,
  NodeType.CODE,
  ...headingNodeTypes
];

export const internalUrlNodeTypeList = [
  NodeType.IMAGE,
  NodeType.VIDEO,
  NodeType.AUDIO,
  NodeType.PDF
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
  duration?: number;
};

export enum NodeRightPaneType {
  NONE = "NONE",
  OUTLINE = "OUTLINE",
  PROPERTIES = "PROPERTIES",
  TRACES = "TRACES",
  SIDENOTES = "SIDENOTES",
  /**
   * @deprecated - merged into properties
   */
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
  SUGGESTION = "SUGGESTION"
}

export type INodeMetadata = { location?: any };

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

type IWebPageBody = {
  url: string;
  hash: string;
  description?: string;
};
export type IWebPage = INodeInterface<
  NodeType.WEB_PAGE,
  IWebPageBody,
  IWebPageMetadata
>;

/**
 * @deprecated - use {@link IWebPage} instead
 */
export type IWebPageNode = {
  body: {
    url: string;
    hash: string;
    description?: string;
  };
  label: string;
  metadata: IWebPageMetadata;
  contentType: NodeType.WEB_PAGE;
};

export type IWebPageMetadata = {
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
  screenshotUrl?: string;
};

type ITextClipBody = {
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
>;

type IVideoTimestampClipBody = {
  timestamp: number;
  url: string;
  s3Url?: string;
};
export type IVideoTimestampClip = INodeInterface<
  NodeType.VIDEO_TIMESTAMP_CLIP,
  IVideoTimestampClipBody,
  any
>;

type IWebScreenshotClipBody = {
  s3Url: string;
};
export type IWebScreenshotClip = INodeInterface<
  NodeType.WEB_SCREENSHOT_CLIP,
  IWebScreenshotClipBody,
  any
>;

type IMultimediaClipBody = {
  s3Url: string;
  url: string;
  color: string;
};
export type IMultimediaClip = INodeInterface<
  NodeType.IMAGE_CLIP,
  IMultimediaClipBody,
  any
>;

export type ITweetBody = {
  url: string;
  content: string;
  postedAt: string;
};
type ITweetMetadata = IWebPageMetadata & {
  tweetId?: string;
  media?: string[];
  externalLinks?: string[];
};
export type ITweet = INodeInterface<NodeType.TWEET, ITweetBody, ITweetMetadata>;

export type ITwitterProfileBody = {
  url: string;
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
>;

export type IClip =
  | ITwitterProfile
  | ITweet
  | IMultimediaClip
  | IVideoTimestampClip
  | ITextClip
  | IWebScreenshotClip;

export type IClipCapture<T = IClip> = Omit<IResourceCapture<T>, "label">;

export enum NodeIdPrefix {
  TWITTER_PROFILE = "twitterProfile"
}
