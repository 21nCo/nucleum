import { parse } from "@21n/shared-utils/json.utils";

/** Decodes only native messages from the current webview window and origin. */
export function parseNativeMessage(
  event: MessageEvent
): Record<string, any> | undefined {
  if (event?.data?.type !== "SWIFT_MESSAGE" || event.source !== window) return;
  if (event.origin !== window.location.origin && event.origin !== "null")
    return;
  const payload = event.data.payload;
  if (typeof payload !== "string" || !payload.trim().startsWith("{")) return;
  return parse(payload);
}
