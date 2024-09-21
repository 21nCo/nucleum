import type { IProperty } from "$lib/client/products/memotron/collection/properties/property.type";
import type { IAvatar } from "$lib/client/types/avatar.type";
import type {
  IObservableStoreSubject,
  IRecordId
} from "$lib/client/types/data.type";
import type { IMarkdown } from "$lib/client/components/markdown/md.type";
import type {
  INodeProperty,
  INodeStructure,
  LinkType
} from "$lib/client/products/memotron/node/node.type";
import { MemotronResourceType } from "../memotron.type";

export enum CaptureType {
  ANY = "Any",
  MARKDOWN = "MARKDOWN",
  AUDIO = "AUDIO",
  CAMERA = "CAMERA",
  UPLOAD = "UPLOAD"
}

export type ICaptureStore = IObservableStoreSubject & {
  label: string | null;
  /**
   * @deprecated
   * There will no avatar for non type based entries. Use type.avatar instead
   */
  avatar?: IAvatar;
  captureType: CaptureType | string;
  body?: IMarkdown;
  file?: IRecordId;
  childrenWithStructure: INodeStructure[];
  rootStructure: string[];
  fileDetails?: FileDetails;
  links?: ILink[];
  propertyConfig?: IProperty[];
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
  pdfAnnotations?: any[];
};

export type ILink = {
  from: string;
  to: string;
  linkType: LinkType;
  toType: MemotronResourceType;
};
