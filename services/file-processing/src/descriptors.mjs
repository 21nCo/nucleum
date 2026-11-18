/**
 * Nucleum's FileFn processors, without their implementations, so a Worker can
 * name them without bundling sharp or tesseract. The producer (the account
 * service) and the processing container must configure the same processor
 * names: FileFn builds each job's idempotency key from the producer's names,
 * and the container records runs under its own.
 */

/** Longest edge of a server thumbnail and PDF preview, in pixels. */
export const THUMBNAIL_EDGE_PX = 512;

/** Kind of the thumbnail the grid renders; the device makes the same kind. */
export const THUMBNAIL_KIND = 'thumbnail-medium';

/** Kind of the first-page PDF preview FileFn serves for the thumbnail intent. */
export const PDF_PREVIEW_KIND = 'pdf-preview-page-1-medium';

/** Kind of a HEIC photo converted to PNG; the device makes the same kind. */
export const CONVERTED_KIND = 'converted';

/** Kind of the text recognized in an image (HEIC photos through their PNG) or a PDF. */
export const OCR_TEXT_KIND = 'ocr-text';

export const HEIC_MIME_TYPES = ['image/heic', 'image/heif'];

export const THUMBNAIL_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/tiff'];

export const OCR_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/tiff', 'image/bmp'];

export const PDF_MIME_TYPES = ['application/pdf'];

/** Each processor's name, the content types it reads and the kinds it writes. */
export const NUCLEUM_PROCESSOR_DESCRIPTORS = Object.freeze([
  Object.freeze({ name: 'thumbnail', supportedMimeTypes: THUMBNAIL_MIME_TYPES, artifactKinds: [THUMBNAIL_KIND] }),
  Object.freeze({ name: 'pdf-preview', supportedMimeTypes: PDF_MIME_TYPES, artifactKinds: [PDF_PREVIEW_KIND] }),
  Object.freeze({ name: 'heic-convert', supportedMimeTypes: HEIC_MIME_TYPES, artifactKinds: [CONVERTED_KIND, THUMBNAIL_KIND] }),
  Object.freeze({
    name: 'ocr',
    supportedMimeTypes: [...OCR_IMAGE_MIME_TYPES, ...HEIC_MIME_TYPES, ...PDF_MIME_TYPES],
    artifactKinds: [OCR_TEXT_KIND]
  })
]);

export const NUCLEUM_PROCESSOR_NAMES = Object.freeze(NUCLEUM_PROCESSOR_DESCRIPTORS.map((descriptor) => descriptor.name));
