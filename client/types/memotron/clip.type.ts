import type { INodeBase, NodeType } from "$lib/client/types/memotron/node.type";

/**
 * TODO - check duplication with tidy lib - Node with ClipContent
 */
export type IClip<T = ClipContent> = INodeBase &
  T & {
  parent: string;
  links?: string[]
  };

export type ClipContent =
  | TextHighlightContent
  | VideoTimestampContent
  | MultimediaClipContent;

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

export type VideoTimestampContent = {
  contentType: NodeType.VIDEO_TIMESTAMP_CLIP;
  body: {
    timestamp: number;
    url: string;
  };
  metadata: any;
};

export type MultimediaClipContent = {
  contentType: NodeType.IMAGE_CLIP;
  body: {
    srcUrl: string;
    url: string;
    color: string;
  };
};

export enum ClipperExtensionEvent {
  CLIPS_CHANGED = "CLIPS_CHANGED",
  PAGE_SAVING_STATUS = "PAGE_SAVING_STATUS",
  RESOLVE_TEXT_HIGHLIGHTS_ORDER = "RESOLVE_TEXT_HIGHLIGHTS_ORDER"
}
