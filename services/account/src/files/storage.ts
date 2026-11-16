import type { StorageAdapter } from "@superfunctions/storage";
import {
  createR2StorageAdapter,
  type R2Fetch
} from "@superfunctions/storage-r2";

/** Environment keys that configure the regional FileFn R2 bucket. */
export const FILEFN_R2_ENV_KEYS = [
  "FILEFN_R2_ACCOUNT_ID",
  "FILEFN_R2_ACCESS_KEY_ID",
  "FILEFN_R2_SECRET_ACCESS_KEY",
  "FILEFN_R2_BUCKET"
] as const;

/** Placeholder in `FILEFN_R2_BUCKET` replaced with the service's region ID. */
export const FILEFN_R2_BUCKET_REGION_PLACEHOLDER = "{region}";

const R2_BUCKET_NAME = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

/** Resolved R2 settings for one regional account service. */
export interface AccountFileStorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/** Test and local overrides for the R2 S3 API transport. */
export interface AccountFileStorageOverrides {
  endpoint?: string;
  fetch?: R2Fetch;
}

/**
 * Reads the FileFn R2 settings for a region, or returns null when any key is
 * unset so the service can run without file storage. `FILEFN_R2_BUCKET` may
 * name the bucket directly or contain `{region}`, which is replaced with the
 * region ID so every region writes to its own bucket.
 */
export function readAccountFileStorageConfig(
  env: Record<string, string | undefined>,
  regionId: string
): AccountFileStorageConfig | null {
  const values = FILEFN_R2_ENV_KEYS.map((key) => env[key]?.trim() ?? "");
  if (values.some((value) => value.length === 0)) {
    return null;
  }
  const [accountId, accessKeyId, secretAccessKey, bucketTemplate] = values;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket: resolveAccountFileBucket(bucketTemplate, regionId)
  };
}

/**
 * Resolves the regional bucket name from a `FILEFN_R2_BUCKET` value and
 * rejects names R2 would not accept.
 */
export function resolveAccountFileBucket(
  template: string,
  regionId: string
): string {
  const bucket = template
    .split(FILEFN_R2_BUCKET_REGION_PLACEHOLDER)
    .join(regionId.trim().toLowerCase());
  if (!R2_BUCKET_NAME.test(bucket)) {
    throw new Error(
      `FILEFN_R2_BUCKET must resolve to a valid R2 bucket name, got ${JSON.stringify(bucket)}`
    );
  }
  return bucket;
}

/**
 * Creates the FILE-4 R2 storage adapter for the service's region, or returns
 * null when R2 is not configured.
 */
export function createAccountFileStorage(
  env: Record<string, string | undefined>,
  regionId: string,
  overrides: AccountFileStorageOverrides = {}
): StorageAdapter | null {
  const config = readAccountFileStorageConfig(env, regionId);
  if (!config) {
    return null;
  }
  return createR2StorageAdapter({
    ...config,
    ...(overrides.endpoint ? { endpoint: overrides.endpoint } : {}),
    ...(overrides.fetch ? { fetch: overrides.fetch } : {})
  });
}
