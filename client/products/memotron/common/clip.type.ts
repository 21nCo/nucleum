import type {
  INodeBase,
  NodeType
} from "$lib/client/products/memotron/node/node.type";

/**
 * @deprecated - use {@link IClipCapture} or {@link IClip} instead - from node.type
 */
export type IClip<T = ClipContent> = INodeBase &
  T & {
    parent: string;
    links?: string[];
  };

  /**
 * @deprecated - use {@link IClipCapture} or {@link IClip} instead - from node.type
 */
export type ClipContent =
  | TextHighlightContent
  | VideoTimestampContent
  | MultimediaClipContent;

  /**
 * @deprecated - use {@link ITextClip} instead
 */
export type TextHighlightContent = {
  contentType: NodeType.TEXT_CLIP;
  body: {
    text: string;
    pre?: string;
    post?: string;
    color: string;
  };
  metadata: {
    container: string;
    anchorNode: string;
    focusNode: string;
    anchorOffset: number;
    focusOffset: number;
  };
};

/**
 * @deprecated - use {@link IVideoTimestampClip} instead
 */
export type VideoTimestampContent = {
  contentType: NodeType.VIDEO_TIMESTAMP_CLIP;
  body: {
    timestamp: number;
    url: string;
  };
  metadata: any;
};

/**
 * @deprecated - use {@link IMultimediaClip} instead
 */
export type MultimediaClipContent = {
  contentType: NodeType.IMAGE_CLIP;
  body: {
    srcUrl: string;
    url: string;
    color: string;
  };
};

/**
 * @deprecated - use {@link IWebScreenshotClip} instead
 */
export type WebScreenshotClipContent = {
  contentType: NodeType.WEB_SCREENSHOT_CLIP;
  body: {
    s3URL: string;
  };
  metadata?: any;
};

export enum ClipperExtensionEvent {
  /**
   * Event to communicate to side panel from content script when clips are altered.
   */
  CLIPS_CHANGED = "CLIPS_CHANGED",
  /**
   * 
   * @deprecated - use ExtensionEvent.PAGE_STATE instead for exchanging page state between content script and side panel.
   * 
   * Event to communicate about the status of saving a page between content script and side panel.
   */
  PAGE_SAVING_STATUS = "PAGE_SAVING_STATUS",
  /**
   * Event to communicate about the order of text highlights between content script and side panel.
   */
  RESOLVE_TEXT_HIGHLIGHTS_ORDER = "RESOLVE_TEXT_HIGHLIGHTS_ORDER",
  /**
   * Event to communicate about taking a screenshot between content script and background script.
   */
  SCREENSHOT = "SCREENSHOT",
  /**
   * Event to relay saving web page from side panel or background script -> to content script to parse web page content and save it.
   */
  SAVE_WEBPAGE = "SAVE_WEBPAGE",
  /**
   * Event to trigger refreshing of clips rendering on the content script.
   */
  REFRESH_CLIPS_RENDERING = "REFRESH_CLIPS_RENDERING",
  /**
   * Relayed from side panel to content script when any clip is mutated like editing notes, links or deleting etc.
   */
  CLIP_MUTATION = "CLIP_MUTATION"
}


export enum ClipperElementIdentifier {
  MAIN_TWEET_POST = "memotron-clipper-main-tweet-post"
}