import { AccessMode } from "@nucleum/datafn/resource.type";
import { isRecordId } from "@nucleum/datafn/resource.utils";
import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";

const LEGACY_FULL_PARAM = "full";

/**
 * Rewrites a URL written by the retired full mode, such as `?full=node:1`, to
 * the layered model: a record opens as the page in full screen, any other
 * path as the overlay in full screen, closing the page and the split beside
 * it as opening a full screen overlay does, since the old full layer covered
 * them. Returns undefined when nothing changes.
 */
export function resolveLegacyFullParamUrl(url: URL): URL | undefined {
  const full = url.searchParams.get(LEGACY_FULL_PARAM);
  const timestampParam = `${LEGACY_FULL_PARAM}At`;
  if (!full && !url.searchParams.has(timestampParam)) return undefined;
  const next = new URL(url.href);
  next.searchParams.delete(LEGACY_FULL_PARAM);
  next.searchParams.delete(timestampParam);
  if (full && isRecordId(full)) {
    next.searchParams.set(AccessMode.PAGE, full);
  } else if (full) {
    for (const mode of [AccessMode.PAGE, AccessMode.BESIDE_PAGE]) {
      next.searchParams.delete(mode);
      next.searchParams.delete(`${mode}At`);
    }
    next.searchParams.set(AccessMode.OVERLAY, full);
  }
  if (full) next.searchParams.set(AppSearchParam.MAX, "true");
  return next;
}

/**
 * In-app path of the rewritten URL from `resolveLegacyFullParamUrl`, or
 * undefined when nothing changes. Leading slashes collapse to one, so a path
 * such as `//other.example/` stays on this origin instead of becoming a
 * protocol-relative URL.
 */
export function resolveLegacyFullParamPath(url: URL): string | undefined {
  const next = resolveLegacyFullParamUrl(url);
  if (!next) return undefined;
  return `${next.pathname.replace(/^\/+/, "/")}${next.search}${next.hash}`;
}
