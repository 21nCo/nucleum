import {
  EmbedDataMessage,
  EmbedMessage
} from "$lib/client/types/embedMessage.enum";
import type { HapticFeedback } from "$lib/client/types/haptic.enum";
import { stringify } from "$lib/shared/utils/json.utils";
import { logger } from "../components/debug/logger.client";

export function pingParent(isExtended: boolean = false) {
  let elapsed = 0;
  if (!isExtended) {
    postMessageToParent(EmbedMessage.PING);
    return;
  }
  const timer = setInterval(() => {
    postMessageToParent(EmbedMessage.PING);
    elapsed++;
    if (elapsed > 10) {
      clearInterval(timer);
    }
  }, 1000);
}

export function postMessageToParent(message: EmbedMessage) {
  postToParent({
    message
  });
}

export function postDataToParent(key: EmbedDataMessage, data: any) {
  postToParent({
    [key]: stringify(data, { isPreventReplacer: true })
  });
}

export function setEmbedBg(bg: number) {
  postDataToParent(EmbedDataMessage.BG, bg);
}

/**
 * TODO - security check
 * @param message
 */
function postToParent(message: any) {
  logger.log({
    at: "posting message to parent",
    message
  });
  try {
    window?.parent?.postMessage(message, "*");
  } catch (error) {
    logger.error({ at: "postToParent - parent", error });
  }
  try {
    //@ts-ignore
    window?.webkit?.messageHandlers?.iOSNative?.postMessage(message);
  } catch (error) {
    logger.error({ at: "postToParent - webkit", error });
  }
  try {
    //@ts-ignore
    window?.chrome?.webview?.postMessage(message);
  } catch (error) {
    logger.error({ at: "postToParent - webview", error });
  }
}

export function postNotificationToParent(message: {
  message: string;
  sound: string;
}) {
  logger.log({ context: "postNotificationToParent", message });
  postToParent({
    notification: message
  });
}

export function hapticFeedback(haptic: HapticFeedback) {
  postToParent({
    haptic
  });
}

export function postTokenToExtension(json: any) {
  window.postMessage(
    {
      type: "signin",
      token: json
    },
    "*"
  );
}
