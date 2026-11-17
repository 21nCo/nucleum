import {
  createOCRProcessor,
  createPdfPreviewProcessor,
  createThumbnailProcessor
} from '@filefn/processing';
import sharp from 'sharp';
import {
  CONVERTED_KIND,
  HEIC_MIME_TYPES,
  NUCLEUM_PROCESSOR_DESCRIPTORS,
  OCR_IMAGE_MIME_TYPES,
  OCR_TEXT_KIND,
  PDF_MIME_TYPES,
  THUMBNAIL_EDGE_PX,
  THUMBNAIL_KIND
} from './descriptors.mjs';

export * from './descriptors.mjs';

/** Pages of a PDF that OCR reads, from the first. */
export const PDF_OCR_MAX_PAGES = 20;

/** Rendering density for PDF pages read by OCR, in dots per inch. */
export const PDF_OCR_DENSITY = 200;

const THUMBNAIL_QUALITY = 80;
const SIZE = { name: 'medium', width: THUMBNAIL_EDGE_PX, height: THUMBNAIL_EDGE_PX };
const HEIC_CONVERSION_FAILED = 'FILEFN_PROCESSING_HEIC_CONVERSION_FAILED';
const OCR_FAILED = 'FILEFN_PROCESSING_OCR_FAILED';

/**
 * Creates Nucleum's FileFn processors, in the order of
 * `NUCLEUM_PROCESSOR_DESCRIPTORS`:
 *
 * - `thumbnail`: a 512 px WebP `thumbnail-medium` of an image;
 * - `pdf-preview`: a 512 px WebP preview of a PDF's first page;
 * - `heic-convert`: a HEIC or HEIF photo as a PNG `converted` image and its
 *   512 px WebP `thumbnail-medium`;
 * - `ocr`: `ocr-text` recognized in an image, or in the first
 *   `PDF_OCR_MAX_PAGES` pages of a PDF, one page after another.
 *
 * `ocrProvider` recognizes text (the container passes the `tesseract`
 * command); without it, `@filefn/processing` uses tesseract.js.
 */
export function createNucleumProcessors(options = {}) {
  const language = options.ocrLanguage ?? 'eng';
  const processors = [
    createThumbnailProcessor({ sizes: [SIZE], format: 'webp', quality: THUMBNAIL_QUALITY }),
    createPdfPreviewProcessor({ sizes: [SIZE], format: 'webp', quality: THUMBNAIL_QUALITY }),
    createHeicConversionProcessor(),
    createImageAndPdfOcrProcessor({ language, provider: options.ocrProvider })
  ];
  return processors.map((processor, index) => {
    const descriptor = NUCLEUM_PROCESSOR_DESCRIPTORS[index];
    if (processor.name !== descriptor.name) {
      throw new Error(`Processor ${processor.name} does not match descriptor ${descriptor.name}`);
    }
    return {
      ...processor,
      supportedMimeTypes: [...descriptor.supportedMimeTypes],
      artifactKinds: [...descriptor.artifactKinds]
    };
  });
}

function createHeicConversionProcessor() {
  return {
    name: 'heic-convert',
    supportedMimeTypes: HEIC_MIME_TYPES,
    async process(input, getData) {
      try {
        const converted = await sharp(Buffer.from(await getData())).rotate().png().toBuffer();
        const thumbnail = await sharp(converted)
          .resize(SIZE.width, SIZE.height, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: THUMBNAIL_QUALITY })
          .toBuffer();
        const baseKey = withoutExtension(input.storageKey);
        return {
          success: true,
          artifacts: [
            {
              kind: CONVERTED_KIND,
              data: new Uint8Array(converted),
              mimeType: 'image/png',
              storageKey: `${baseKey}-converted.png`,
              metadata: { format: 'png', sourceFileId: input.fileId, sourceVersionId: input.versionId }
            },
            {
              kind: THUMBNAIL_KIND,
              data: new Uint8Array(thumbnail),
              mimeType: 'image/webp',
              storageKey: `${baseKey}-thumb-${SIZE.name}.webp`,
              metadata: {
                width: SIZE.width,
                height: SIZE.height,
                quality: THUMBNAIL_QUALITY,
                format: 'webp',
                sourceFileId: input.fileId,
                sourceVersionId: input.versionId
              }
            }
          ]
        };
      } catch {
        return { success: false, artifacts: [], error: HEIC_CONVERSION_FAILED };
      }
    }
  };
}

/**
 * OCR of images through `@filefn/processing`, and of PDFs by rendering each
 * page (up to `PDF_OCR_MAX_PAGES`) and recognizing it with the same provider.
 */
function createImageAndPdfOcrProcessor({ language, provider }) {
  const imageOcr = createOCRProcessor({ language, provider });
  return {
    name: 'ocr',
    supportedMimeTypes: [...OCR_IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
    async process(input, getData) {
      if (!PDF_MIME_TYPES.includes(input.mimeType)) {
        return imageOcr.process(input, getData);
      }
      try {
        const recognizer = provider ?? (await defaultOcrProvider());
        const pdf = Buffer.from(await getData());
        const { pages = 1 } = await sharp(pdf, { density: PDF_OCR_DENSITY }).metadata();
        const pageCount = Math.min(pages, PDF_OCR_MAX_PAGES);
        const texts = [];
        for (let page = 0; page < pageCount; page += 1) {
          const imageData = await sharp(pdf, { density: PDF_OCR_DENSITY, page }).png().toBuffer();
          const result = await recognizer.recognize({
            input,
            imageData: new Uint8Array(imageData),
            language,
            includeHOCR: false
          });
          texts.push(result.text);
        }
        return {
          success: true,
          artifacts: [
            {
              kind: OCR_TEXT_KIND,
              data: new TextEncoder().encode(texts.join('\n\f\n')),
              mimeType: 'text/plain',
              storageKey: `${withoutExtension(input.storageKey)}-ocr.txt`,
              metadata: {
                language,
                format: 'text',
                pages: pageCount,
                totalPages: pages,
                extractedAt: new Date().toISOString(),
                sourceFileId: input.fileId,
                sourceVersionId: input.versionId
              }
            }
          ]
        };
      } catch {
        return { success: false, artifacts: [], error: OCR_FAILED };
      }
    }
  };
}

async function defaultOcrProvider() {
  const { createTesseractJsOCRProvider } = await import('@filefn/processing');
  return createTesseractJsOCRProvider();
}

function withoutExtension(storageKey) {
  return storageKey.replace(/\.[^/.]+$/, '');
}
