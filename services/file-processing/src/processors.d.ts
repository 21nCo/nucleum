import type { OCRProcessorProvider, Processor } from '@filefn/processing';

export * from './descriptors.js';

export declare const PDF_OCR_MAX_PAGES: number;
export declare const PDF_OCR_DENSITY: number;

/** Inputs the loaded sharp can decode. */
export interface NucleumCodecs {
  /** PDF pages (libvips' PDF loader). */
  pdf: boolean;
  /** HEIC photos (libheif with an HEVC decoder). */
  heic: boolean;
}

/** Probes `sharp.format` (or the given formats) for the PDF and HEIC decoders. */
export declare function detectNucleumCodecs(formats?: unknown): NucleumCodecs;

/** The processing `codecs` cannot do, such as `pdf-preview` or `ocr of PDFs`. */
export declare function unsupportedNucleumProcessing(codecs: NucleumCodecs): string[];

export interface NucleumProcessorsOptions {
  /** Tesseract languages, such as `eng` or `eng+deu`; defaults to `eng`. */
  ocrLanguage?: string;
  /** Recognizes text; defaults to `@filefn/processing`'s tesseract.js provider. */
  ocrProvider?: OCRProcessorProvider;
  /**
   * Decoders available in this process; processors and content types they
   * cannot decode are left out. Omitted (the container), every processor is
   * created.
   */
  codecs?: NucleumCodecs;
}

export type NucleumProcessor = Processor & { artifactKinds: string[] };

export declare function createNucleumProcessors(options?: NucleumProcessorsOptions): NucleumProcessor[];
