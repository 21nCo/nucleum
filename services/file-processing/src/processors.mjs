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
const PDF_RENDER_UNAVAILABLE = 'FILEFN_PROCESSING_PDF_RENDER_UNAVAILABLE';

/**
 * Which inputs the loaded sharp (libvips) can decode: PDFs (libvips' PDF
 * loader) and HEIC photos (libheif with an HEVC decoder; without one, libvips
 * lists only `.avif` for its HEIF loader). The processing container's image
 * has both; the npm prebuilt sharp a Node server loads has neither.
 */
export function detectNucleumCodecs(formats = sharp.format) {
  const heif = formats?.heif?.input;
  return {
    pdf: formats?.pdf?.input?.buffer === true,
    heic: heif?.buffer === true && (heif.fileSuffix ?? []).includes('.heic')
  };
}

/**
 * The processing `codecs` cannot do, by processor, such as `pdf-preview` or
 * `ocr of PDFs`; empty when it does everything.
 */
export function unsupportedNucleumProcessing(codecs) {
  const missing = [];
  if (!codecs.pdf) missing.push('pdf-preview', 'ocr of PDFs');
  if (!codecs.heic) missing.push('heic-convert', 'ocr of HEIC photos');
  return missing;
}

/**
 * Creates Nucleum's FileFn processors, in the order of
 * `NUCLEUM_PROCESSOR_DESCRIPTORS`:
 *
 * - `thumbnail`: a 512 px WebP `thumbnail-medium` of an image;
 * - `pdf-preview`: a 512 px WebP preview of a PDF's first page, failing
 *   instead of recording a placeholder when the page cannot be rendered;
 * - `heic-convert`: a HEIC or HEIF photo as a PNG `converted` image and its
 *   512 px WebP `thumbnail-medium`;
 * - `ocr`: `ocr-text` recognized in an image (a HEIC photo through its PNG),
 *   or in the first `PDF_OCR_MAX_PAGES` pages of a PDF, one page after
 *   another.
 *
 * `ocrProvider` recognizes text (the container passes the `tesseract`
 * command); without it, `@filefn/processing` uses tesseract.js.
 *
 * Without `codecs`, every processor is created: the container, whose image
 * decodes everything, must name the same processors as the producer. With
 * `codecs` (a Node server running them in process), the processors and
 * content types those codecs cannot decode are left out, so an upload never
 * records a run, or an artifact, its decoder could not produce.
 */
export function createNucleumProcessors(options = {}) {
  const language = options.ocrLanguage ?? 'eng';
  const codecs = options.codecs ?? { pdf: true, heic: true };
  const ocrMimeTypes = [
    ...OCR_IMAGE_MIME_TYPES,
    ...(codecs.heic ? HEIC_MIME_TYPES : []),
    ...(codecs.pdf ? PDF_MIME_TYPES : [])
  ];
  const processors = [
    createThumbnailProcessor({ sizes: [SIZE], format: 'webp', quality: THUMBNAIL_QUALITY }),
    codecs.pdf && createRenderedPdfPreviewProcessor(),
    codecs.heic && createHeicConversionProcessor(),
    createImageAndPdfOcrProcessor({ language, provider: options.ocrProvider, supportedMimeTypes: ocrMimeTypes })
  ].filter(Boolean);
  return processors.map((processor) => {
    const descriptor = NUCLEUM_PROCESSOR_DESCRIPTORS.find((item) => item.name === processor.name);
    if (!descriptor) {
      throw new Error(`Processor ${processor.name} has no descriptor`);
    }
    const supportedMimeTypes =
      processor.name === 'ocr' ? ocrMimeTypes : [...descriptor.supportedMimeTypes];
    return { ...processor, supportedMimeTypes, artifactKinds: [...descriptor.artifactKinds] };
  });
}

/**
 * `@filefn/processing`'s PDF preview, except that a PDF whose first page
 * sharp cannot render fails the run instead of recording the placeholder
 * image it would draw: runs are idempotent, so a placeholder would never be
 * replaced by the real preview.
 */
function createRenderedPdfPreviewProcessor() {
  const preview = createPdfPreviewProcessor({ sizes: [SIZE], format: 'webp', quality: THUMBNAIL_QUALITY });
  return {
    ...preview,
    async process(input, getData) {
      const result = await preview.process(input, getData);
      if (result.success && result.artifacts.some((artifact) => artifact.metadata?.renderMode !== 'page-rasterized')) {
        return { success: false, artifacts: [], error: PDF_RENDER_UNAVAILABLE };
      }
      return result;
    }
  };
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
 * OCR of images through `@filefn/processing` (a HEIC photo after converting
 * it to PNG), and of PDFs by rendering each page (up to `PDF_OCR_MAX_PAGES`)
 * and recognizing it with the same provider.
 */
function createImageAndPdfOcrProcessor({ language, provider, supportedMimeTypes }) {
  const imageOcr = createOCRProcessor({ language, provider });
  return {
    name: 'ocr',
    supportedMimeTypes,
    async process(input, getData) {
      if (!supportedMimeTypes.includes(input.mimeType)) {
        return { success: false, artifacts: [], error: `Unsupported MIME type: ${input.mimeType}` };
      }
      if (HEIC_MIME_TYPES.includes(input.mimeType)) {
        let png;
        try {
          png = await sharp(Buffer.from(await getData())).rotate().png().toBuffer();
        } catch {
          return { success: false, artifacts: [], error: OCR_FAILED };
        }
        return imageOcr.process({ ...input, mimeType: 'image/png' }, async () => new Uint8Array(png));
      }
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
