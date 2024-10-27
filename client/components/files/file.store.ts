import { nodeStore } from "$lib/client/products/memotron/node/node.store";
import { toasts } from "$lib/client/stores/notification.store";
import type { IRecordId } from "$lib/client/types/data.type";
import { logger } from "../debug/logger.client";
import { Resource } from "../flux/resourceStores/resource.enum";
import { ResourceStore } from "../flux/resourceStores/resource.store";
import { determineResourceType } from "../flux/resourceStores/resource.utils";
import type { IFile } from "./file.type";

class FileStore extends ResourceStore<IFile> {
  constructor() {
    super(Resource.file);
  }

  async download(file: IFile | IRecordId | string) {
    logger.log({ at: "fileStore - download", file });
    try {
      let _file;
      if (typeof file === "object" && "url" in file) _file = file;
      else if (typeof file === "string" && file.includes("http")) _file = file;
      else {
        let fileId: IRecordId | undefined = undefined;
        const resource = determineResourceType(file);
        if (resource === Resource.node) {
          const node = await nodeStore.select(file as IRecordId);
          if (node && node.file) {
            fileId = node.file;
          }
        } else {
          fileId = file as IRecordId;
        }
        if (!fileId) return;
        _file = await this.select(fileId);
        console.log({ _file });
        if (!_file) return;
      }
      const response = await fetch(_file.url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = _file.name || _file.label || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      logger.error({ at: "fileStore - download", error });
      toasts.error("Error downloading file. Please try again.");
    }
  }
}

export const fileStore = new FileStore();
