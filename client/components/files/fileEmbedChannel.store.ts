import { ObservableStore } from "@21n/stores/client.store";
import { EmbedDataMessage } from "@21n/types/embedMessage.enum";
import { postDataToParent } from "@21n/utils/embed.utils";
import { wait } from "@21n/utils/time.utils";
import type { IFileEmbedChannel } from "@21n/components/files/file.type";

class FileEmbedChannel extends ObservableStore<IFileEmbedChannel> {
  constructor() {
    super("file-embed-channel");
    this.set({ files: [] });
  }

  async fetch(url: string, id: string) {
    const store = this.get();
    let file = store.files.find((f) => f.id === id);
    if (file) return file.data;
    postDataToParent(EmbedDataMessage.FETCH, {
      url: url.toString(),
      id
    });
    let isDataReceived = false;
    let timeElapsed = 0;
    while (!isDataReceived) {
      if (timeElapsed > 5000) {
        throw new Error("Timeout waiting for data");
      }
      const store = this.get();
      file = store.files.find((f) => f.id === id);
      if (file) {
        isDataReceived = true;
        break;
      }
      await wait(500);
      timeElapsed += 500;
    }
    if (!file) return;
    return file.data;
  }

  downloadFromUrl(url: string, fileName?: string) {
    postDataToParent(EmbedDataMessage.DOWNLOAD, {
      url: url.toString(),
      filename: fileName
    });
  }

  download(data: string, contentType: string) {
    postDataToParent(EmbedDataMessage.DOWNLOAD, {
      data,
      contentType
    });
  }

  setFile(id: string, data: string) {
    const store = this.get();
    const files = store.files.filter((f) => f.id !== id);
    files.push({ id, data });
    this.set({ files });
  }

  base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }
  /**
   * TODO - use ui.utils.ts base64ToBlob instead
   * */
  base64ToBlob(base64: string, type: string): Blob {
    const uint8Array = this.base64ToUint8Array(base64);
    return new Blob([uint8Array], { type });
  }
}

export const fileEmbedChannel = new FileEmbedChannel();
