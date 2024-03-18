import { logger } from "../stores/log.store";
import { EmbedMessage } from "../types/embedMessage.enum";
import type { HapticFeedback } from "../types/haptic.enum";

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
export function postToParent(message: any) {
  logger.log("posting message to parent:" + JSON.stringify(message));
  try {
    window?.parent?.postMessage(message, "*");
  } catch (error) {
    logger.logError(error);
  }
  try {
    //@ts-ignore
    window?.webkit?.messageHandlers?.iOSNative?.postMessage(message);
  } catch (error) {
    logger.logError(error);
  }
}

export function hapticFeedback(haptic: HapticFeedback) {
  postToParent({
    haptic
  });
}
