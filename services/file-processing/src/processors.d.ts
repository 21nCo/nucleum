import type { OCRProcessorProvider, Processor } from '@filefn/processing';

export * from './descriptors.js';

export declare const PDF_OCR_MAX_PAGES: number;
export declare const PDF_OCR_DENSITY: number;

export interface NucleumProcessorsOptions {
  /** Tesseract languages, such as `eng` or `eng+deu`; defaults to `eng`. */
  ocrLanguage?: string;
  /** Recognizes text; defaults to `@filefn/processing`'s tesseract.js provider. */
  ocrProvider?: OCRProcessorProvider;
}

export type NucleumProcessor = Processor & { artifactKinds: string[] };

export declare function createNucleumProcessors(options?: NucleumProcessorsOptions): NucleumProcessor[];
