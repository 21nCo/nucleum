import { fileEmbedChannel } from "./fileEmbedChannel.store";

/** Delivers native download acknowledgements and file payloads to their pending requests. */
export function handleNativeFileMessage(message: Record<string, any>): boolean {
  if (
    (message.type === "DOWNLOAD_SUCCESS" ||
      message.type === "DOWNLOAD_ERROR") &&
    message.id
  ) {
    fileEmbedChannel.setDownloadResult(
      message.id,
      message.type === "DOWNLOAD_SUCCESS"
    );
    return true;
  }
  if (!message.type && message.id && message.data) {
    fileEmbedChannel.setFile(message.id, message.data);
    return true;
  }
  return false;
}
