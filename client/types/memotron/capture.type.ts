import type { Avatar } from "$lib/client/types/avatar.type";
import type { CacheableStore } from "$lib/client/types/data.type";
import type { Markdown } from "$lib/client/types/memotron/md.type";
import type { LinkThumbnail, MediaBody, NodeProperty } from "./node.type";

export enum CaptureType {
  ANY = "Any",
  MARKDOWN = "MARKDOWN",
  AUDIO = "AUDIO",
  CAMERA = "CAMERA",
  UPLOAD = "UPLOAD"
}

export type CaptureStore = CacheableStore & {
  label: string | null;
  /**
   * @deprecated
   * There will no avatar for non type based entries. Use type.avatar instead
   */
  avatar?: Avatar;
  captureType: CaptureType | string;
  type?: any;
  body: Markdown | MediaBody;
  fileDetails?: FileDetails;
  links: LinkThumbnail[];
  properties?: NodeProperty[];
  /**
   * To trigger refresh of capture page when on appear or reset etc...
   * as change of body object in markdown is not detected by svelte
   */
  refreshId: number;
};

export type FileDetails = {
  data: any;
  name: string;
  type: string;
  duration?: number;
};
