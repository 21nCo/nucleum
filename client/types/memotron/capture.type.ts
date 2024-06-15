import type { IAvatar } from "$lib/client/types/avatar.type";
import type { ICacheableStore } from "$lib/client/types/data.type";
import type { IMarkdown } from "$lib/client/types/memotron/md.type";
import type {
  LinkThumbnail,
  MediaBody,
  INodeProperty,
  INodeStructure
} from "./node.type";

export enum CaptureType {
  ANY = "Any",
  MARKDOWN = "MARKDOWN",
  AUDIO = "AUDIO",
  CAMERA = "CAMERA",
  UPLOAD = "UPLOAD"
}

export type CaptureStore = ICacheableStore & {
  label: string | null;
  /**
   * @deprecated
   * There will no avatar for non type based entries. Use type.avatar instead
   */
  avatar?: IAvatar;
  captureType: CaptureType | string;
  type?: any;
  body: IMarkdown | MediaBody;
  childrenWithStructure: INodeStructure[];
  rootStructure: string[];
  fileDetails?: FileDetails;
  links: LinkThumbnail[];
  properties?: INodeProperty[];
  /**
   * To trigger refresh of capture page when on appear or reset etc...
   * as change of body object in markdown is not detected by svelte
   */
  refreshId: number;
};

export type FileDetails = {
  name: string;
  data: Blob;
  url: any;
  type: string;
  duration?: number;
  transcription?: string;
  initTranscription?: boolean;
};
