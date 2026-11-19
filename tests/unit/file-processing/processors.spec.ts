import {
  createNucleumProcessors,
  detectNucleumCodecs,
  NUCLEUM_PROCESSOR_DESCRIPTORS,
  unsupportedNucleumProcessing
} from "../../../services/file-processing/src/processors.mjs";
import { openFileFnDatabase, requireVerifiedPostgresUrl } from "../../../services/file-processing/src/postgres.mjs";
import { createRequire } from "node:module";
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
    ["repeated TLS parameters", "postgres://db.example/files?sslmode=verify-full&sslmode=disable"],
    ["sslrootcert=SYSTEM, which postgres.js sends in plaintext", "postgres://db.example/files?sslrootcert=SYSTEM"],
    [
      "sslrootcert=SYSTEM with sslmode=require, which skips the certificate check",
      "postgres://db.example/files?sslrootcert=SYSTEM&sslmode=require"
    ],
    ["a non-exact sslmode spelling", "postgres://db.example/files?sslmode=Verify-Full"]
  ])("refuses %s before connecting", (_label, url) => {
    expect(() => openFileFnDatabase({ FILEFN_DATABASE_URL: url }, filefnSchema)).toThrow(
      /FILEFN_CONTAINER_CONFIG_INVALID/
    );
  });

  it.each([
    "postgres://db.example/files?sslmode=verify-full",
    "postgres://db.example/files?sslrootcert=system",
    "postgres://db.example/files?sslrootcert=system&sslmode=require",
    "postgres://127.0.0.1:5432/files"
  ])("opens %s", async (url) => {
    const database = openFileFnDatabase({ FILEFN_DATABASE_URL: url }, filefnSchema);
    await database.close();
  });

  it.each([
    "postgres://db.example/files?sslmode=verify-full",
    "postgres://db.example/files?sslrootcert=system",
    "postgres://db.example/files?sslrootcert=system&sslmode=require"
  ])("accepts the remote URL %s only because the container's postgres.js verifies its certificate", async (url) => {
    const postgres = createRequire(new URL("../../../services/file-processing/package.json", import.meta.url))(
      "postgres"
    ) as (url: string) => { options: { ssl: unknown }; end: () => Promise<void> };
    const database = openFileFnDatabase({ FILEFN_DATABASE_URL: url }, filefnSchema);
    await database.close();
    const sql = postgres(url);
    expect(sql.options.ssl).toBe("verify-full");
    await sql.end();
  });

  it.each(DRIVER_PARITY_URLS)(
    "decides %s on the hosts and TLS mode the container's postgres.js parses (accepted: %s)",
    async (url, accepted) => {
      expect(await containerDriverVerifies(url)).toBe(accepted);
      let urlCheckPassed = true;
      try {
        requireVerifiedPostgresUrl(url);
      } catch {
        urlCheckPassed = false;
      }
      expect(urlCheckPassed).toBe(accepted);
      if (accepted) {
        await openFileFnDatabase({ FILEFN_DATABASE_URL: url }, filefnSchema).close();
      } else {
        expect(() => openFileFnDatabase({ FILEFN_DATABASE_URL: url }, filefnSchema)).toThrow(
          /FILEFN_CONTAINER_CONFIG_INVALID/
        );
      }
    }
  );

  it("checks the options postgres.js parsed even when the URL check passes", async () => {
    vi.resetModules();
    vi.doMock("../../../services/file-processing/src/postgres-url.mjs", async (importOriginal) => ({
      ...(await importOriginal<typeof import("../../../services/file-processing/src/postgres-url.mjs")>()),
      requireVerifiedPostgresUrl: () => {}
    }));
    try {
      const { openFileFnDatabase: openUnchecked } = await import(
        "../../../services/file-processing/src/postgres.mjs"
      );
      expect(() =>
        openUnchecked({ FILEFN_DATABASE_URL: "postgres://a@evil.example,b@localhost/db" }, filefnSchema)
      ).toThrow(/postgres.js would connect to a non-loopback FILEFN_DATABASE_URL host without ssl=verify-full/);
      await openUnchecked({ FILEFN_DATABASE_URL: "postgres://u@localhost,127.0.0.1/db" }, filefnSchema).close();
    } finally {
      vi.doUnmock("../../../services/file-processing/src/postgres-url.mjs");
      vi.resetModules();
    }
  });
});

/**
 * [url, accepted]: accepted exactly when postgres.js uses ssl=verify-full or
 * connects only to loopback. postgres.js takes the host list after the FIRST
 * `@`, where WHATWG URL splits userinfo at the last.
 */
const DRIVER_PARITY_URLS: Array<[string, boolean]> = [
  ["postgres://u:p@db.example/files", false],
  ["postgres://u:p@db.example/files?sslmode=verify-full", true],
  ["postgres://u:p@db.example/files?ssl=verify-full", true],
  ["postgres://u:p@db.example/files?sslrootcert=SYSTEM", false],
  ["postgres://u:p@localhost:5432/files", true],
  ["postgres://u:p@LOCALHOST/files", false],
  ["postgres://u:p@127.0.0.1/files", true],
  ["postgres://u@[::1]:5432/files", false],
  ["postgres://a@evil.example,b@localhost/db", false],
  ["postgres://u:p@ss,w@localhost/db", false],
  ["postgres://a@evil.example,b@localhost/db?sslrootcert=system", true],
  ["postgres://u:p%40x@db.example/files", false],
  ["postgres://u:p%40x@localhost/files", true],
  ["postgres://u@localhost%2Cevil.example/files", false],
  ["postgres://u@localhost,127.0.0.1:5433/files", true],
  ["postgres://u@LOCALHOST,localhost/files", false],
  ["postgres://u@localhost,db.example/files", false],
  ["postgres://u@localhost,db.example/files?sslmode=verify-full", true],
  ["postgres://u@db.example,localhost/files?sslmode=require", false]
];

/** The independent oracle: what the container's own postgres.js parses from `url`. */
async function containerDriverVerifies(url: string): Promise<boolean> {
  const postgres = createRequire(new URL("../../../services/file-processing/package.json", import.meta.url))(
    "postgres"
  ) as (url: string) => { options: { ssl: unknown; host: string[] }; end: () => Promise<void> };
  let sql;
  try {
    sql = postgres(url);
  } catch {
    return false;
  }
  const { ssl, host } = sql.options;
  await sql.end();
  return ssl === "verify-full" || host.every((entry) => entry === "localhost" || entry === "127.0.0.1");
}
