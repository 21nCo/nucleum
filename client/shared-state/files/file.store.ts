import context from "@nucleum/client/runtime/context.store";
import { toasts } from "@nucleum/shared-state/notifications/notification.store";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { get } from "svelte/store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { isRecordId } from "@nucleum/datafn/resource.utils";
import type { IFile } from "@nucleum/shared-state/files/file.type";
import { fileEmbedChannel } from "@nucleum/shared-state/files/fileEmbedChannel.store";
import { OperatingSystem } from "@nucleum/client/runtime/context.type";
import { datafn } from "@nucleum/datafn/datafn.store";
import { resolveFileUrl } from "@nucleum/shared-state/files/file-url";

function resolveBlobPart(data: Uint8Array<ArrayBufferLike>) {
  return Uint8Array.from(data).buffer;
}

class FileStore {
  private async select(fileId: IRecordId) {
    const result = await datafn.file.query({
      filters: { id: fileId }
    });
    return result.data?.[0] as IFile | undefined;
  }

  /**
   * Downloads a file: a URL string, a `file` record or its record ID. A
   * FileFn record downloads its original through a URL FileFn resolves; a
   * legacy record downloads from its bytes or its stored URL.
   */
  async download(file: IFile | IRecordId | string) {
    logger.log({ at: "fileStore - download", file });
    const defaultErrMessage = "Error downloading file. Please try again.";
    try {
      let _file: IFile | string | undefined;
      if (
        typeof file === "object" &&
        ("url" in file || "data" in file || "fileId" in file)
      )
        _file = file;
      else if (typeof file === "string" && file.includes("http")) _file = file;
      else {
        _file = await this.select(file as IRecordId);
        if (!_file) return;
      }
      if (!_file) return;
      if (typeof _file === "string") {
        const response = await fetch(_file);
        const blob = await response.blob();
        this.downloadFromBlob(blob, {
          fileName: "download"
        });
        return;
      }
      const contextStore = get(context);
      if (contextStore.isEmbed) {
        //TODO - handle offline user case
        const url = await this.resolveDownloadUrl(_file);
        if (!url) {
          if (_file.fileId) toasts.error(defaultErrMessage);
          return;
        }
        fileEmbedChannel.downloadFromUrl(
          url,
          (_file.label ?? _file.name ?? _file.id).split(".")[0]
        );
        if (contextStore.os === OperatingSystem.MACOS) {
          toasts.success("File downloaded to Downloads folder");
        }
        return;
      }
      let blob;
      try {
        if (!_file.fileId && _file.data) {
          blob = new Blob([resolveBlobPart(_file.data)], { type: _file.type });
        } else {
          const url = await this.resolveDownloadUrl(_file);
          if (!url) {
            if (_file.fileId) toasts.error(defaultErrMessage);
            return;
          }
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`File download failed with ${response.status}`);
          }
          blob = await response.blob();
        }
      } catch (error: any) {
        logger.warn({ at: "fileStore - download", error });
        toasts.error(defaultErrMessage);
        return;
      }
      if (!blob) {
        toasts.error(defaultErrMessage);
        return;
      }
      this.downloadFromBlob(blob, {
        fileName: _file.name || _file.label || "download",
        contentType: _file.type
      });
    } catch (error) {
      logger.error({ at: "fileStore - download", error });
      toasts.error(defaultErrMessage);
    }
  }

  /**
   * Returns the URL a record downloads from: FileFn's URL of the original
   * bytes for a FileFn record, which never reads a legacy URL, else the
   * stored URL.
   */
  private resolveDownloadUrl(file: IFile): Promise<string | undefined> {
    if (file.fileId) return resolveFileUrl(file.fileId, "download");
    return Promise.resolve(file.url ?? undefined);
  }

  async downloadFromBlob(
    blob: Blob,
    params?: {
      contentType?: string;
      fileName?: string;
      fileNameForEmbed?: string;
      isHandleEmbedCase?: boolean;
    }
  ) {
    if (get(context).isEmbed) {
      if (!params?.isHandleEmbedCase) return false;
      return fileEmbedChannel.downloadFromBlob(
        blob,
        params?.fileName || params?.fileNameForEmbed || "download",
        params?.contentType || blob.type || "application/octet-stream"
      );
    }
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = params?.fileName || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    return true;
  }

  /**
   * Returns the file with renderable URLs. A FileFn record (one with
   * `fileId`) gets `url` from FileFn's full variant, or, when a thumbnail is
   * asked for, `thumbnailUrl` from its thumbnail variant and `url` from the
   * full variant only when there is no thumbnail; both come from the in-memory
   * URL cache and any legacy URL on the record is never read. A record with
   * bytes on the device gets object URLs of them, and a legacy record is
   * returned with its stored URLs, which are no longer re-signed.
   * @param file a `file` record or its record ID
   * @returns a promise of the file, or undefined when it cannot be read
   */
  async refresh(
    file: IFile | IRecordId,
    params?: {
      isUseThumbnailIfAvailable?: boolean;
    }
  ): Promise<IFile | undefined> {
    try {
      logger.log({ at: "fileStore - refresh", file });
      if (!file) return;
      if (typeof file === "string" && isRecordId(file)) {
        const _file = await this.select(file as IRecordId);
        if (!_file) return;
        file = _file;
      }
      if (typeof file !== "object") return;
      if (file.fileId) {
        return await this.resolveFileFnUrls(file, file.fileId, params);
      }
      if (
        params?.isUseThumbnailIfAvailable &&
        "thumbnailData" in file &&
        file.thumbnailData
      ) {
        return {
          ...file,
          thumbnailUrl: URL.createObjectURL(
            new Blob([resolveBlobPart(file.thumbnailData)], {
              type: "image/jpeg"
            })
          )
        };
      }
      if ("data" in file && file.data) {
        return {
          ...file,
          url: URL.createObjectURL(
            new Blob([resolveBlobPart(file.data)], { type: file.type })
          )
        };
      }
      if (!("url" in file) || !file.url) return;
      return { ...file };
    } catch (error) {
      logger.error({ at: "fileStore - refresh", error });
      return;
    }
  }

  private async resolveFileFnUrls(
    file: IFile,
    fileId: string,
    params?: { isUseThumbnailIfAvailable?: boolean }
  ): Promise<IFile> {
    const record = { ...file, url: undefined, thumbnailUrl: undefined };
    const thumbnailUrl = params?.isUseThumbnailIfAvailable
      ? await resolveFileUrl(fileId, "thumbnail")
      : undefined;
    if (thumbnailUrl) return { ...record, thumbnailUrl };
    return { ...record, url: await resolveFileUrl(fileId, "full") };
  }
}

export const fileStore = new FileStore();
