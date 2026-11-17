import {
  createNucleumProcessors,
  detectNucleumCodecs,
  NUCLEUM_PROCESSOR_DESCRIPTORS,
  unsupportedNucleumProcessing
} from "../../../services/file-processing/src/processors.mjs";
import { openFileFnDatabase } from "../../../services/file-processing/src/postgres.mjs";
import { describe, expect, it, vi } from "vitest";
import * as filefnSchema from "../../../services/account/src/db/generated/filefn/filefn-schema";

const PREBUILT_FORMATS = {
  pdf: { input: { buffer: false } },
  heif: { input: { buffer: true, fileSuffix: [".avif"] } }
};
const CONTAINER_FORMATS = {
  pdf: { input: { buffer: true } },
  heif: { input: { buffer: true, fileSuffix: [".heic", ".heif", ".avif"] } }
};

/** A 16x16 white AVIF: a HEIF photo the npm prebuilt sharp can decode. */
const HEIF_PHOTO = Buffer.from(
  "AAAAHGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZgAAAOptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAEOAAEAAAAAAAAAGAAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAamlwcnAAAABLaXBjbwAAABNjb2xybmNseAABAA0ABoAAAAAMYXYxQ4EgAgAAAAAUaXNwZQAAAAAAAAAQAAAAEAAAABBwaXhpAAAAAAMICAgAAAAXaXBtYQAAAAAAAAABAAEEAYIDBAAAACBtZGF0EgAKCDgM/9hAQ0GkMgoYAAAAQACpjL+c",
  "base64"
);

const input = (mimeType: string) => ({
  fileId: "file",
  versionId: "version",
  fileName: "photo.heic",
  mimeType,
  size: 1,
  storageKey: "files/file/version/photo.heic"
});

describe("Nucleum processors and decoders", () => {
  it("reads the PDF and HEIC decoders from sharp's formats", () => {
    expect(detectNucleumCodecs(PREBUILT_FORMATS)).toEqual({ pdf: false, heic: false });
    expect(detectNucleumCodecs(CONTAINER_FORMATS)).toEqual({ pdf: true, heic: true });
    expect(unsupportedNucleumProcessing({ pdf: true, heic: true })).toEqual([]);
  });

  it("names every descriptor, OCR included for HEIC photos, when no codecs are given (the container)", () => {
    const processors = createNucleumProcessors();
    expect(processors.map(({ name, supportedMimeTypes, artifactKinds }) => ({ name, supportedMimeTypes, artifactKinds }))).toEqual(
      NUCLEUM_PROCESSOR_DESCRIPTORS.map(({ name, supportedMimeTypes, artifactKinds }) => ({
        name,
        supportedMimeTypes,
        artifactKinds
      }))
    );
    expect(processors.find((processor) => processor.name === "ocr")?.supportedMimeTypes).toEqual(
      expect.arrayContaining(["image/heic", "image/heif", "application/pdf"])
    );
  });

  it("leaves out the processors and OCR inputs the codecs cannot decode", () => {
    const processors = createNucleumProcessors({ codecs: { pdf: false, heic: true } });
    expect(processors.map((processor) => processor.name)).toEqual(["thumbnail", "heic-convert", "ocr"]);
    const ocr = processors.find((processor) => processor.name === "ocr")!;
    expect(ocr.supportedMimeTypes).toContain("image/heic");
    expect(ocr.supportedMimeTypes).not.toContain("application/pdf");
  });

  it("recognizes text in a HEIC photo through its PNG", async () => {
    const recognize = vi.fn(async (_request: { imageData: Uint8Array }) => ({ text: "receipt", confidence: 90 }));
    const ocr = createNucleumProcessors({ ocrProvider: { recognize } }).find((processor) => processor.name === "ocr")!;

    const result = await ocr.process(input("image/heic"), async () => new Uint8Array(HEIF_PHOTO));

    expect(result).toMatchObject({ success: true, artifacts: [{ kind: "ocr-text", mimeType: "text/plain" }] });
    const imageData = recognize.mock.calls[0]![0].imageData;
    expect(Buffer.from(imageData.subarray(0, 8)).toString("hex")).toBe("89504e470d0a1a0a");
  });
});

describe("processing container database", () => {
  it.each([
    ["a plaintext remote URL", "postgres://db.example/files"],
    ["sslmode=require, which skips the certificate check", "postgres://db.example/files?sslmode=require"],
    ["repeated TLS parameters", "postgres://db.example/files?sslmode=verify-full&sslmode=disable"]
  ])("refuses %s before connecting", (_label, url) => {
    expect(() => openFileFnDatabase({ FILEFN_DATABASE_URL: url }, filefnSchema)).toThrow(
      /FILEFN_CONTAINER_CONFIG_INVALID/
    );
  });

  it.each([
    "postgres://db.example/files?sslmode=verify-full",
    "postgres://db.example/files?sslrootcert=system",
    "postgres://127.0.0.1:5432/files"
  ])("opens %s", async (url) => {
    const database = openFileFnDatabase({ FILEFN_DATABASE_URL: url }, filefnSchema);
    await database.close();
  });
});
