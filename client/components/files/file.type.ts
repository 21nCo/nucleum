import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { IResource } from "../flux/resourceStores/resource.type";

export type IFile = IResource & {
  type: string;
  size: number;
  duration?: number;
  url?: string | null;
  data?: Uint8Array;
  thumbnailUrl?: string | null;
  thumbnailData?: Uint8Array;
};

export enum FileType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  PDF = "application",
  UNKNOWN = "unknown"
}

export type IImageRepositionerOptions = {
  enabled?: boolean;
  axis?: "x" | "y";
  initialPosition?: number;
};

export type IFileEmbedChannel = IObservableStoreSubject & {
  files: { id: string; data: any }[];
};
