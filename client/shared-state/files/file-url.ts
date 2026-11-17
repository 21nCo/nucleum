import type { FileFnClient } from "@filefn/client";
import { resolveViewerSource, type RenderIntent } from "@filefn/viewer";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  captureSettledFileFnOwner,
  confirmFileFnOwner,
  getOwnedFileFnClient,
  type FileFnOwner
} from "@nucleum/shared-state/files/filefn-client";

/**
 * A variant of a FileFn file: the thumbnail and full image a browser renders,
 * or the original bytes a download saves.
 */
export type FileUrlVariant = Extract<
  RenderIntent,
  "thumbnail" | "full" | "download"
>;

/** A cached URL is resolved again this long before it expires. */
export const FILE_URL_REFRESH_MARGIN_MS = 60_000;
/** Lifetime assumed for a URL that carries no `X-Amz-Expires`. */
export const FILE_URL_DEFAULT_TTL_MS = 5 * 60_000;
/**
 * How long a variant with nothing to render yet (a placeholder, such as a PDF
 * preview still processing) or a failed resolution is kept before retrying,
 * so a grid of files does not ask FileFn again on every render.
 */
export const FILE_URL_RETRY_MS = 30_000;

/** Image types browsers cannot decode, whose full image is their conversion. */
const UNDECODABLE_IMAGE_TYPES = new Set(["image/heic", "image/heif"]);

type FileUrlEntry = {
  /** Time after which a lookup resolves the variant again. */
  refreshAt: number;
  url: Promise<string | undefined>;
};

/** Resolved URLs of the current owner, keyed by file and variant. */
const cache = new Map<string, FileUrlEntry>();
let cacheOwnerKey: string | undefined;

/**
 * Returns a renderable URL of a FileFn file's variant, or undefined when no
 * cloud account is signed in, the variant has nothing to render yet, or
 * FileFn cannot be reached. Resolution goes through `@filefn/viewer` with the
 * signed-in account's FileFn client. The result is kept in memory per file
 * and variant until shortly before the URL expires, concurrent lookups share
 * one request, and the cache belongs to one FileFn owner: a sign-out, another
 * account or another authority clears it, and a lookup returns its URL only
 * once the account's current authority is settled and still belongs to the
 * owner it started under, so a URL is never shown to another account. The
 * full variant of a HEIC or HEIF original is its converted image, or the
 * original, asked for again after the retry interval, while FileFn has none;
 * the download variant is the original.
 */
export async function resolveFileUrl(
  fileId: string,
  variant: FileUrlVariant
): Promise<string | undefined> {
  let owner: FileFnOwner | null;
  try {
    owner = await captureSettledFileFnOwner();
  } catch (error: unknown) {
    logger.warn({ at: "fileUrl.resolve", fileId, variant, error });
    return undefined;
  }
  const ownerKey = owner ? `${owner.userId}:${owner.epoch}` : undefined;
  if (ownerKey !== cacheOwnerKey) {
    cache.clear();
    cacheOwnerKey = ownerKey;
  }
  if (!owner) return undefined;
  const key = `${variant}:${fileId}`;
  const cached = cache.get(key);
  const entry =
    cached && Date.now() < cached.refreshAt
      ? cached
      : startFileUrlLookup(owner, key, fileId, variant);
  const url = await entry.url;
  return (await isCurrentFileFnOwner(owner)) ? url : undefined;
}

/** Drops every cached URL; the next lookup of each variant resolves it again. */
export function clearFileUrlCache() {
  cache.clear();
  cacheOwnerKey = undefined;
}

function startFileUrlLookup(
  owner: FileFnOwner,
  key: string,
  fileId: string,
  variant: FileUrlVariant
): FileUrlEntry {
  const entry: FileUrlEntry = {
    refreshAt: Number.POSITIVE_INFINITY,
    url: Promise.resolve(undefined)
  };
  entry.url = fetchFileUrl(owner, fileId, variant).then(
    ({ url, refreshAt }) => {
      entry.refreshAt = refreshAt;
      return url;
    },
    (error: unknown) => {
      entry.refreshAt = Date.now() + FILE_URL_RETRY_MS;
      logger.warn({ at: "fileUrl.resolve", fileId, variant, error });
      return undefined;
    }
  );
  cache.set(key, entry);
  return entry;
}

async function isCurrentFileFnOwner(owner: FileFnOwner) {
  try {
    await confirmFileFnOwner(owner);
    return true;
  } catch {
    return false;
  }
}

async function fetchFileUrl(
  owner: FileFnOwner,
  fileId: string,
  variant: FileUrlVariant
): Promise<{ url: string | undefined; refreshAt: number }> {
  const requestedAt = Date.now();
  const owned = await getOwnedFileFnClient(owner);
  const source = await resolveViewerSource({
    client: owned.client,
    fileId,
    intent: variant
  });
  if (!source.url) {
    return { url: undefined, refreshAt: Date.now() + FILE_URL_RETRY_MS };
  }
  if (variant !== "full" || !isUndecodableImage(source.mimeType)) {
    return {
      url: toAbsoluteUrl(source.url, owned.baseUrl),
      refreshAt: resolveRefreshAt(source.url, requestedAt)
    };
  }
  const converted = await resolveConvertedUrl(
    owned.client,
    fileId,
    source.versionId
  );
  if (!converted) {
    return {
      url: toAbsoluteUrl(source.url, owned.baseUrl),
      refreshAt: Math.min(
        resolveRefreshAt(source.url, requestedAt),
        Date.now() + FILE_URL_RETRY_MS
      )
    };
  }
  return {
    url: toAbsoluteUrl(converted, owned.baseUrl),
    refreshAt: resolveRefreshAt(converted, requestedAt)
  };
}

/**
 * Returns a URL of the version's browser-decodable converted image, or
 * undefined when FileFn has none.
 */
async function resolveConvertedUrl(
  client: FileFnClient,
  fileId: string,
  versionId: string
): Promise<string | undefined> {
  const artifacts = await client.listArtifacts(fileId);
  const converted = artifacts.find(
    (artifact) =>
      artifact.kind === "converted" &&
      artifact.versionId === versionId &&
      !isUndecodableImage(artifact.mimeType)
  );
  if (!converted) return undefined;
  return client.downloadArtifact(fileId, converted.artifactId);
}

function isUndecodableImage(mimeType: string) {
  return UNDECODABLE_IMAGE_TYPES.has(
    mimeType.split(";")[0].trim().toLowerCase()
  );
}

/**
 * Resolves a root-relative proxy URL under the FileFn authority, as the
 * FileFn client does for proxy uploads; any other URL is returned unchanged.
 */
function toAbsoluteUrl(url: string, baseUrl: string) {
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  return `${baseUrl.replace(/\/$/, "")}${url}`;
}

/**
 * Returns when a URL must be resolved again: a margin before it expires, or
 * halfway through a lifetime shorter than twice the margin. The lifetime is
 * the URL's `X-Amz-Expires` counted from when the request started, so a
 * device clock that differs from the signer's does not expire it early.
 */
function resolveRefreshAt(url: string, requestedAt: number) {
  const lifetimeMs = readSignedLifetimeMs(url) ?? FILE_URL_DEFAULT_TTL_MS;
  return (
    requestedAt +
    Math.max(
      lifetimeMs - FILE_URL_REFRESH_MARGIN_MS,
      Math.floor(lifetimeMs / 2)
    )
  );
}

function readSignedLifetimeMs(url: string): number | undefined {
  let expires: string | null;
  try {
    expires = new URL(url, "https://filefn.invalid").searchParams.get(
      "X-Amz-Expires"
    );
  } catch {
    return undefined;
  }
  if (!expires || !/^\d+$/.test(expires)) return undefined;
  return Number(expires) * 1000;
}
