import { AccessMode } from "@nucleum/datafn/resource.type";
import { isRecordId } from "@nucleum/datafn/resource.utils";
import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";

const LEGACY_FULL_PARAM = "full";

/**
 * Rewrites a URL written by the retired full mode, such as `?full=node:1`, to
 * the layered model: a record opens as the page in full screen, any other
 * path as the overlay in full screen. Returns undefined when nothing changes.
 */
export function resolveLegacyFullParamUrl(url: URL): URL | undefined {
  const full = url.searchParams.get(LEGACY_FULL_PARAM);
  const timestampParam = `${LEGACY_FULL_PARAM}At`;
  if (!full && !url.searchParams.has(timestampParam)) return undefined;
  const next = new URL(url.href);
  next.searchParams.delete(LEGACY_FULL_PARAM);
  next.searchParams.delete(timestampParam);
  if (full) {
    next.searchParams.set(
      isRecordId(full) ? AccessMode.PAGE : AccessMode.OVERLAY,
      full
    );
    next.searchParams.set(AppSearchParam.MAX, "true");
  }
  return next;
}
