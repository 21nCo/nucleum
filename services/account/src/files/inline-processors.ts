import type { Processor } from "@filefn/server";

/** Logger told once which processing the Node server cannot do. */
export interface InlineProcessorsLogger {
  warn(message: string, context?: Record<string, unknown>): void;
}

/**
 * Loads Nucleum's processors for a Node server running them in process. They
 * use the npm prebuilt sharp, whose libvips usually has no PDF loader and no
 * HEVC decoder, so the processors and content types it cannot decode (PDF
 * previews and OCR, HEIC conversion and OCR) are left out and logged: they
 * would otherwise fail, or record a placeholder preview that the idempotent
 * job never replaces. The processing container decodes them all. Node only:
 * the Worker must never bundle sharp.
 */
export async function loadInlineNucleumProcessors(
  logger: InlineProcessorsLogger,
  formats?: unknown
): Promise<Processor[]> {
  const {
    createNucleumProcessors,
    detectNucleumCodecs,
    unsupportedNucleumProcessing
  } = await import("@21n/file-processing");
  const codecs = detectNucleumCodecs(formats);
  const unsupported = unsupportedNucleumProcessing(codecs);
  if (unsupported.length > 0) {
    logger.warn(
      "nucleus account file processing skips what this sharp cannot decode; the processing container does it",
      { unsupported }
    );
  }
  return createNucleumProcessors({ codecs });
}
