import { persistenceInstance } from "@21n/persistence/persistence";
import context from "@21n/stores/context.store";
import { toasts } from "@21n/stores/notification.store";
import type {
  IRecordId,
  IResourceFilterValue,
  IResourceSelectAdditionalParams,
  IResourceSelectParams,
  IResourceSelectProperties
} from "@21n/types/data.type";
import { getBucketNameandKey, isUrlExpired } from "@21n/utils/account.utils";
import { get } from "svelte/store";
import { logger } from "@21n/components/debug/logger.client";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "@21n/components/flux/resourceStores/resource.store";
import { isRecordId } from "@21n/components/flux/resourceStores/resource.utils";
import type { IFile, IFileCapture } from "@21n/components/files/file.type";
import { fileEmbedChannel } from "@21n/components/files/fileEmbedChannel.store";
import { OperatingSystem } from "@21n/types/context.type";
import account from "@21n/stores/account.store";
import { datafn } from "@21n/stores/datafn.store";
import { isExtensionEnvironment } from "@21n/utils/browser.utils";

function resolveBlobPart(data: Uint8Array<ArrayBufferLike>) {
  return Uint8Array.from(data).buffer;
}

function resolveDatafnFilterValue(value: IResourceFilterValue) {
  if (Array.isArray(value)) return { $in: value };
  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }
  const operators = {
    $gt: value.greaterThan,
    $lt: value.lessThan,
    $gte: value.greaterThanOrEqual,
    $lte: value.lessThanOrEqual,
    $nin: value.notIn,
    $contains: value.contains,
    $ne: value.notEquals
  };
  return Object.fromEntries(
    Object.entries(operators).filter(
      ([, operatorValue]) => operatorValue !== undefined
    )
  );
}

function resolveDatafnFilters(filters: IResourceSelectParams["filters"]) {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, resolveDatafnFilterValue(value)])
  );
}

class FileStore extends ResourceStore<IFile, IFileCapture> {
  constructor() {
    super(Resource.file, {
      defaultProps: {
        type: ""
      }
    });
  }

  async select(
    resourceId: IRecordId,
    properties?: IResourceSelectProperties,
    params?: { signal?: AbortSignal }
  ) {
    if (isExtensionEnvironment()) {
      return super.select(resourceId, properties, params);
    }
    return datafn.file.select(resourceId.toString(), {
      select:
        properties?.select && properties.select.length > 0
          ? properties.select
          : undefined,
      signal: params?.signal
    }) as Promise<IFile | undefined>;
  }

  async selectMany(
    params?: IResourceSelectParams,
    additionalParams?: IResourceSelectAdditionalParams
  ) {
    if (isExtensionEnvironment()) {
      return super.selectMany(params, additionalParams);
    }
    const sort = Object.entries(params?.orderBy ?? {}).map(
      ([field, direction]) => (direction === "desc" ? `-${field}` : field)
    );
    const result = await datafn.file.query({
      filters: resolveDatafnFilters(params?.filters),
      select:
        params?.properties?.select && params.properties.select.length > 0
          ? params.properties.select
          : undefined,
      omit:
        params?.properties?.omit && params.properties.omit.length > 0
          ? params.properties.omit
          : undefined,
      sort: sort.length > 0 ? sort : undefined,
      limit: params?.limit,
      offset: params?.offset,
      signal: additionalParams?.signal,
      metadata: {
        includeArchived:
          additionalParams?.isIncludeInactiveItems === true ||
          params?.filters?.isArchived === true,
        includeTrashed: additionalParams?.isIncludeInactiveItems === true
      }
    });
    return result.data as unknown as IFile[];
  }

  async download(file: IFile | IRecordId | string) {
    logger.log({ at: "fileStore - download", file });
    const defaultErrMessage = "Error downloading file. Please try again.";
    try {
      let _file;
      if (typeof file === "object" && ("url" in file || "data" in file))
        _file = file;
      else if (typeof file === "string" && file.includes("http")) _file = file;
      else {
        _file = await this.select(file as IRecordId);
        if (!_file) return;
      }
      const contextStore = get(context);
      if (contextStore.isEmbed) {
        //TODO - handle offline user case
        void fileEmbedChannel.downloadFromUrl(
          _file.url,
          _file.label.split(".")[0]
        );
        if (contextStore.os === OperatingSystem.MACOS) {
          toasts.success("File downloaded to Downloads folder");
        }
        return;
      }
      let blob;
      try {
        if (_file.data) {
          blob = new Blob([_file.data], { type: _file.type });
        } else {
          const response = await fetch(_file.url);
          blob = await response.blob();
        }
      } catch (error: any) {
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
      const url = await account.uploadFileV2(
        params?.contentType || "text/plain",
        params?.fileNameForEmbed || params?.fileName || "download",
        blob,
        {
          isReturnUrl: true
        }
      );
      if (url) {
        const result = await fileEmbedChannel.downloadFromUrl(
          url,
          params?.fileNameForEmbed
        );
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        return result;
      }
      return false;
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

  private async updateUrlIfExpired(
    file: IFile | IRecordId,
    params?: {
      isUseThumbnailIfAvailable?: boolean;
    }
  ): Promise<IFile | undefined> {
    if (typeof file !== "object" || !("url" in file) || !file.url) return;

    if (
      params?.isUseThumbnailIfAvailable &&
      file.thumbnailUrl &&
      isUrlExpired(file.thumbnailUrl)
    ) {
      let key = getBucketNameandKey(file.thumbnailUrl);
      let signedUrl = await persistenceInstance.fetchSignedUrlForGet(key);
      if (isExtensionEnvironment()) {
        await super.modify(
          file.id,
          {
            thumbnailUrl: signedUrl?.getUrl
          },
          {
            isPreventCloudPersistence: true
          }
        );
      }
      return { ...file, thumbnailUrl: signedUrl?.getUrl };
    } else if (isUrlExpired(file.url)) {
      let key = getBucketNameandKey(file.url);
      let signedUrl = await persistenceInstance.fetchSignedUrlForGet(key);
      if (isExtensionEnvironment()) {
        await super.modify(
          file.id,
          {
            url: signedUrl?.getUrl
          },
          {
            isPreventCloudPersistence: true
          }
        );
      }
      return { ...file, url: signedUrl?.getUrl };
    } else return file;
  }

  /**
   * Updates the url if expired, replaces url with data url if data is present.
   * @param file
   * @returns a promise of file or undefined
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
      if (isRecordId(file)) {
        const _file = await this.select(file as IRecordId);
        if (!_file) return;
        file = _file;
      }
      if (
        params?.isUseThumbnailIfAvailable &&
        typeof file === "object" &&
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
      if (typeof file === "object" && "data" in file && file.data) {
        return {
          ...file,
          url: URL.createObjectURL(
            new Blob([resolveBlobPart(file.data)], { type: file.type })
          )
        };
      }
      const response = await this.updateUrlIfExpired(file, params);
      if (!response) return;
      file = { ...response };
      return file;
    } catch (error) {
      logger.error({ at: "fileStore - refresh", error });
      return;
    }
  }
}

export const fileStore = FileStore.resolve(Resource.file);
