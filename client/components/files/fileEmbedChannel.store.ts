import { ObservableStore } from "$lib/client/stores/client.store";
import { postToParent } from "$lib/client/utils/embed.utils";
import { wait } from "$lib/client/utils/time.utils";
import type { IFileEmbedChannel } from "./file.type";

class FileEmbedChannel extends ObservableStore<IFileEmbedChannel> {
  constructor() {
    super("file-embed-channel");
    this.set({ files: [] });
  }

  async fetch(url: string, id: string) {
    const store = this.get();
    let file = store.files.find((f) => f.id === id);
    if (file) return file.data;
    postToParent({
      fetch: JSON.stringify({ url: url.toString(), id })
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
    postToParent({
      download: JSON.stringify({ url: url.toString(), filename: fileName })
    });
  }

  download(data: string, contentType: string) {
    postToParent({
      download: JSON.stringify({ data, contentType })
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

  base64ToBlob(base64: string, type: string): Blob {
    const uint8Array = this.base64ToUint8Array(base64);
    return new Blob([uint8Array], { type });
  }
}

export const fileEmbedChannel = new FileEmbedChannel();
