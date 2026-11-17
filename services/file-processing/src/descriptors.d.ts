export interface NucleumProcessorDescriptor {
  readonly name: string;
  readonly supportedMimeTypes: string[];
  readonly artifactKinds: string[];
}

export declare const THUMBNAIL_EDGE_PX: number;
export declare const THUMBNAIL_KIND: string;
export declare const PDF_PREVIEW_KIND: string;
export declare const CONVERTED_KIND: string;
export declare const OCR_TEXT_KIND: string;
export declare const HEIC_MIME_TYPES: string[];
export declare const THUMBNAIL_MIME_TYPES: string[];
export declare const OCR_IMAGE_MIME_TYPES: string[];
export declare const PDF_MIME_TYPES: string[];
export declare const NUCLEUM_PROCESSOR_DESCRIPTORS: readonly NucleumProcessorDescriptor[];
export declare const NUCLEUM_PROCESSOR_NAMES: readonly string[];
