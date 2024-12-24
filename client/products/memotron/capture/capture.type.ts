import type { IProperty } from "$lib/client/products/memotron/collection/properties/property.type";
import type { IAvatar } from "$lib/client/types/avatar.type";
import type {
  IObservableStoreSubject,
  IRecordId
} from "$lib/client/types/data.type";
import type { IMarkdown } from "$lib/client/components/markdown/md.type";
import type {
  INodePropertyValue,
  INodeStructure,
  LinkType,
  NodeType
} from "$lib/client/products/memotron/node/node.type";
import type { CollectionType } from "../collection/collection.type";
import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

export enum CaptureType {
  MARKDOWN = "MARKDOWN",
  AUDIO = "AUDIO",
  CAMERA = "CAMERA",
  SKETCH = "SKETCH",
  UPLOAD = "UPLOAD"
}

export type ICaptureStore = IObservableStoreSubject & {
  label: string | null;
  /**
   * @deprecated
   * There will no avatar for non type based entries. Use type.avatar instead
   */
  avatar?: IAvatar | null;
  /**
   * @deprecated
   */
  captureType?: CaptureType | string;
  body?: IMarkdown;
  file?: IRecordId;
  childrenWithStructure: INodeStructure[];
  rootStructure: string[];
  links?: ICaptureLink[];
  propertyConfig?: IProperty[];
  properties?: INodePropertyValue[];
  /**
   * To trigger refresh of capture page when on appear or reset etc...
   * as change of body object in markdown is not detected by svelte
   */
  refreshId: number;
  /**
   * Used in context of markdown capture - to save embeded content with a creation Context
   */
  nodeId?: IRecordId;
  /**
   * Used in context of `Insert into markdown` from global paste and global drag and drop upload
   */
  clipboard?: IPasteCaptureData;
};

type ICaptureLink = {
  from: IRecordId | "root";
  to: IRecordId;
  linkType: LinkType;
  toType: Resource.node | Resource.collection;
  toSubType?: CollectionType | NodeType;
  location?: IRecordId;
  tags?: IRecordId[];
};

export type IMultiFileCaptureData = {
  files: { file: File; contentType: NodeType }[];
  totalCount: number;
  sizeExceededCount: number;
};

export type IPasteCaptureData = {
  contentType?: NodeType;
  text?: string;
  textMetadata?: {
    isMultiBlockText?: boolean;
    isUrl?: boolean;
    isMarkdown?: boolean;
    isEmbed?: boolean;
    codeLanguage?: string;
  };
  file?: File;
  multipleFiles?: IMultiFileCaptureData;
  error?: string;
};
