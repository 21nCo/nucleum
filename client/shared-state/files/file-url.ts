import { resolveViewerSource, type RenderIntent } from "@filefn/viewer";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  captureFileFnOwner,
  getOwnedFileFnClient,
  type FileFnOwner
} from "@nucleum/shared-state/files/filefn-client";

/** A renderable variant of a FileFn file. */
export type FileUrlVariant = Extract<RenderIntent, "thumbnail" | "full">;

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
 * account or another authority clears it, so a URL is never shown to another
 * account.
 */
export function resolveFileUrl(
  fileId: string,
  variant: FileUrlVariant
): Promise<string | undefined> {
  const owner = captureFileFnOwner();
  const ownerKey = owner ? `${owner.userId}:${owner.epoch}` : undefined;
  if (ownerKey !== cacheOwnerKey) {
    cache.clear();
    cacheOwnerKey = ownerKey;
  }
  if (!owner) return Promise.resolve(undefined);
  const key = `${variant}:${fileId}`;
  const cached = cache.get(key);
  if (cached && Date.now() < cached.refreshAt) return cached.url;
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
  return entry.url;
}

/** Drops every cached URL; the next lookup of each variant resolves it again. */
export function clearFileUrlCache() {
  cache.clear();
  cacheOwnerKey = undefined;
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
  return {
    url: toAbsoluteUrl(source.url, owned.baseUrl),
    refreshAt: resolveRefreshAt(source.url, requestedAt)
  };
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
