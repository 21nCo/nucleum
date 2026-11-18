import { readNucleumContainerConfig } from "../../../services/file-processing/src/container-config.mjs";
import { describe, expect, it } from "vitest";

type Env = Record<string, string | undefined>;

const FILE9_PROCESSORS = ["thumbnail", "pdf-preview", "ocr"];

/** Applies the FILE-9 image's `readContainerConfig` rules this module relies on. */
function readFile9Config(env: Env) {
  for (const name of (env.FILEFN_PROCESSORS ?? FILE9_PROCESSORS.join(",")).split(",")) {
    if (!FILE9_PROCESSORS.includes(name.trim())) {
      throw new Error(`FILEFN_PROCESSORS: unknown processor "${name}"`);
    }
  }
  for (const key of ["FILEFN_R2_ACCOUNT_ID", "FILEFN_R2_BUCKET", "FILEFN_DATABASE"]) {
    if (env[key] === undefined) throw new Error(`${key} is required`);
  }
  const maxRetries = Number(env.FILEFN_PROCESSING_MAX_RETRIES ?? "3");
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new Error("FILEFN_PROCESSING_MAX_RETRIES must be an integer from 0 to 1000");
  }
  return { bucket: env.FILEFN_R2_BUCKET, database: env.FILEFN_DATABASE, maxRetries };
}

const BASE_ENV: Env = {
  FILEFN_R2_ACCOUNT_ID: "account",
  FILEFN_R2_BUCKET: "files-eu",
  FILEFN_DATABASE: "/app/nucleum/src/database.mjs",
  FILEFN_PROCESSING_MAX_RETRIES: "3"
};

describe("readNucleumContainerConfig", () => {
  it("resolves the configuration when FILEFN_PROCESSORS names a processor the FILE-9 image rejects", () => {
    const env = { ...BASE_ENV, FILEFN_PROCESSORS: "thumbnail,heic-convert" };
    expect(() => readFile9Config(env)).toThrow(/heic-convert/);
    expect(readNucleumContainerConfig(env, readFile9Config)).toEqual({
      bucket: "files-eu",
      database: "/app/nucleum/src/database.mjs",
      maxRetries: 3
    });
  });

  it("passes every other setting on without FILEFN_PROCESSORS and leaves the caller's environment unchanged", () => {
    const env = { ...BASE_ENV, FILEFN_PROCESSORS: "heic-convert" };
    const seen: Env[] = [];
    readNucleumContainerConfig(env, (configEnv: Env) => {
      seen.push(configEnv);
      return readFile9Config(configEnv);
    });
    expect(seen).toEqual([BASE_ENV]);
    expect(seen[0]).not.toBe(env);
    expect(env).toEqual({ ...BASE_ENV, FILEFN_PROCESSORS: "heic-convert" });
  });

  it.each([
    ["an invalid FILEFN_PROCESSING_MAX_RETRIES", { FILEFN_PROCESSING_MAX_RETRIES: "-1" }, /FILEFN_PROCESSING_MAX_RETRIES/],
    ["a missing R2 bucket", { FILEFN_R2_BUCKET: undefined }, /FILEFN_R2_BUCKET is required/],
    ["a missing database module", { FILEFN_DATABASE: undefined }, /FILEFN_DATABASE is required/]
  ])("still rejects %s", (_label, overrides, message) => {
    const env = { ...BASE_ENV, FILEFN_PROCESSORS: "heic-convert", ...overrides };
    expect(() => readNucleumContainerConfig(env, readFile9Config)).toThrow(message);
  });
});
