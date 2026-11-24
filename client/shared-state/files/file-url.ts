import type { FileFnClient } from "@filefn/client";
import { resolveViewerSource, type RenderIntent } from "@filefn/viewer";
import account from "@nucleum/client/runtime/account/account.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import {
  isQueuedFileFailed,
  onQueuedFileFailureChange,
  resolveFileQueueDirsOf,
  resolveQueuedFileUrl,
  retryFailedQueuedFile,
  type QueuedFileFailureOwner
} from "@nucleum/shared-state/files/file-queue";
import {
  captureFileFnOwner,
  captureFileQueueClaim,
  captureSettledFileFnOwner,
  confirmFileFnOwner,
  getOwnedFileFnClient,
  isFileFnOwnerCurrent,
  isFileFnOwnerLive,
  resolveFileFnAccountScope,
  resolveFileFnBaseUrl,
  settleFileFnOwner,
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
 * once the account's current authority is settled, checking in the same
 * synchronous step as it returns that the URL's owner is still current with
 * no newer authority read pending, so a URL is never shown to another account
 * or authority. The full variant of a HEIC or HEIF original is its converted
 * image, or the original, asked for again after the retry interval, while
 * FileFn has none; the download variant is the original.
 *
 * A file still in the FileFn OPFS queue of the signed-in account, or of the
 * device's local queue, renders from its bytes on the device for every
 * account mode, offline too: its thumbnail, or undefined when none was kept,
 * and the original for the full and download variants. Those object URLs are
 * not kept in the owner's cache. The queues read are those of the cloud
 * account signed in when the lookup starts; when that account's generation
 * has ended by the time the bytes are read (a sign-out, another account or
 * another authority), undefined is returned (and a render URL revoked), so one
 * account's queued bytes are never shown to another.
 */
export async function resolveFileUrl(
  fileId: string,
  variant: FileUrlVariant
): Promise<string | undefined> {
  try {
    const queueOwner = captureFileFnOwner();
    const queued = await resolveQueuedFileUrl(
      resolveFileQueueDirsOf(queueOwner?.userId ?? null),
      fileId,
      variant
    );
    if (queued !== null) {
      if (!queueOwner || isFileFnOwnerLive(queueOwner)) return queued;
      if (queued && variant !== "download") URL.revokeObjectURL(queued);
      return undefined;
    }
  } catch (error: unknown) {
    logger.warn({ at: "fileUrl.queued", fileId, variant, error });
  }
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
  try {
    await confirmFileFnOwner(owner);
    while (!isFileFnOwnerCurrent(owner)) await settleFileFnOwner(owner);
  } catch {
    return undefined;
  }
  return url;
}

/**
 * Calls `onChange` with whether a file's upload failed on this device: FileFn
 * rejected it for good while it is still in the FileFn OPFS queue of the
 * signed-in cloud account, or of the device's local queue, read as
 * resolveFileUrl reads them (see isQueuedFileFailed). It reads it now,
 * again whenever that file's failed state may have changed (see
 * onQueuedFileFailureChange: marked, retried, removed, uploaded or written
 * again) and whenever another cloud account, or none, is signed in,
 * reporting the latest read only, and never once stopped; a read during
 * which another account, or none, was signed in, or that fails, and one of
 * a file another account or authority claimed or started (see
 * isQueuedFileFailed), reports false, so another account or device shows the
 * file as it shows any file it cannot resolve. Returns the stop.
 *
 * Reading is not a file operation: it only reads the account state, so it
 * never requests the account's FileFn client nor authorizes its replay (see
 * captureFileFnOwner); only the user's Retry does (see retryFileUpload). It
 * reads at the authority the account's client binds to (see
 * readAccountOwner), the one Retry captures, so a file shown failed is one
 * whose Retry uploads it again. A change of the stored region alone, which
 * the client only reads when the account state changes, is read on the
 * next account change or failure change.
 */
export function watchFileUploadFailure(
  fileId: string,
  onChange: (isFailed: boolean) => void
): () => void {
  let isStopped = false;
  let reads = 0;
  const read = async () => {
    const at = ++reads;
    const isFailed = await readFileUploadFailure(fileId);
    if (!isStopped && at === reads) onChange(isFailed);
  };
  const stopChanges = onQueuedFileFailureChange((changed) => {
    if (changed === fileId) void read();
  });
  let readerKey: string | undefined;
  const stopAccount = account.subscribe(() => {
    const scope = readAccountScope();
    const key = scope ? `${scope.userId}\n${scope.region ?? ""}` : "";
    if (key === readerKey) return;
    readerKey = key;
    void read();
  });
  return () => {
    isStopped = true;
    stopChanges();
    stopAccount();
  };
}

/** The signed-in cloud account and its session region, null without one. */
function readAccountScope() {
  try {
    return resolveFileFnAccountScope(account.get());
  } catch (error: unknown) {
    logger.warn({ at: "fileUrl.failure.owner", error });
    return null;
  }
}

/**
 * The signed-in cloud account at the FileFn authority its client binds to
 * (see syncFileFnClient): its session region's, else the stored region's,
 * else insouth's; null without an account. Read from the account state and
 * the stored region alone, it requests no FileFn client or replay grant.
 */
async function readAccountOwner(): Promise<QueuedFileFailureOwner> {
  const scope = readAccountScope();
  if (!scope) return null;
  const region =
    scope.region ??
    (await clientStorage.get(ClientStorageKey.REGION)) ??
    "insouth";
  return { userId: scope.userId, baseUrl: resolveFileFnBaseUrl(region) };
}

function toReaderKey(owner: QueuedFileFailureOwner) {
  return owner ? `${owner.userId}\n${owner.baseUrl}` : "";
}

async function readFileUploadFailure(fileId: string): Promise<boolean> {
  try {
    const owner = await readAccountOwner();
    const isFailed = await isQueuedFileFailed(
      resolveFileQueueDirsOf(owner?.userId ?? null),
      fileId,
      owner
    );
    if (!isFailed) return false;
    return toReaderKey(await readAccountOwner()) === toReaderKey(owner);
  } catch (error: unknown) {
    logger.warn({ at: "fileUrl.failure", fileId, error });
    return false;
  }
}

/**
 * Retries a file whose upload failed (see watchFileUploadFailure) from the
 * queues of the signed-in cloud account, or the device's local queue: it
 * uploads again on the queue's next replay, which starts now while one is
 * running for the queue (see retryFailedQueuedFile). Resolves whether the
 * file was failed; a retry that fails is logged and resolves false. Unlike
 * watching, a Retry is the user's file operation, so it requests the
 * account's FileFn client as any file operation does (see captureFileFnOwner),
 * and retries only at the authority that client settles on (see
 * captureFileQueueClaim) while the owner's generation lasts: a file that
 * authority would not replay, or an owner that ended, keeps its mark.
 */
export async function retryFileUpload(fileId: string): Promise<boolean> {
  try {
    const owner = captureFileFnOwner();
    if (!owner) {
      return await retryFailedQueuedFile(resolveFileQueueDirsOf(null), fileId);
    }
    if (!isFileFnOwnerLive(owner)) return false;
    const claim = await captureFileQueueClaim(owner);
    if (!claim || !isFileFnOwnerLive(owner)) return false;
    return await retryFailedQueuedFile(
      resolveFileQueueDirsOf(owner.userId),
      fileId,
      claim,
      () => isFileFnOwnerLive(owner)
    );
  } catch (error: unknown) {
    logger.warn({ at: "fileUrl.retry", fileId, error });
    return false;
  }
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
