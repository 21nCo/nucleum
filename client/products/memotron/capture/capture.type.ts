import type { IProperty } from "$lib/client/components/collection/properties/property.type";
import type { IAvatar } from "$lib/client/types/avatar.type";
import type { IRecordId } from "$lib/client/types/data.type";
import type { IMarkdown } from "$lib/client/components/markdown/md.type";
import type {
  INodeStructure,
  NodeType
} from "$lib/client/products/memotron/node/node.type";
import type { LinkType } from "$lib/client/products/memotron/linking/link.type";
import type {
  CollectionType,
  ICollectionItemPropertyValue
} from "$lib/client/components/collection/collection.type";
import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import type {
  IActiveResource,
  IResource,
  IResourceShareable
} from "$lib/client/components/flux/resourceStores/resource.type";

export enum CaptureMethod {
  MARKDOWN = "MARKDOWN",
  AUDIO = "AUDIO",
  CAMERA = "CAMERA",
  SKETCH = "SKETCH",
  WEB = "WEB",
  UPLOAD = "UPLOAD",
  SCAN = "SCAN",
  PASTE = "PASTE"
}

export type ICaptureBase = {
  label: string | null;
  method: CaptureMethod;
  /**
   * @deprecated
   * There will no avatar for non type based entries. Use type.avatar instead
   */
  avatar?: IAvatar | null;
  body?: IMarkdown;
  file?: IRecordId;
  childrenWithStructure: INodeStructure[];
  rootStructure: string[];
  links?: ICaptureLink[];
  propertyConfig?: IProperty[];
  properties?: ICollectionItemPropertyValue[];
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
   * @deprecated - use `clipboard` store instead
   * Used in context of `Insert into markdown` from global paste and global drag and drop upload
   */
  clipboard?: IPasteCaptureData;
};

export type ICaptureCapture = ICaptureBase;

type IResourcePropertiesForCapture = IResource & IResourceShareable;
export type ICapture = ICaptureBase & IResourcePropertiesForCapture;

export type IActiveCapture = IActiveResource &
  ICapture & {
    isEmpty?: boolean;
    isWindowDnD?: boolean;
    isAvoidSaveLeaks?: boolean;
    isSaving?: boolean;
    isLinksExpanded?: boolean;
    isCaptureFromCollectionPage?: boolean;
    bulkQueryParam?: string | null;
    linkQueryParam?: string | null;
    expandedType?: IRecordId | null;
    isProcessingClipboard?: boolean;
  };

export type ICaptureLink = {
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
