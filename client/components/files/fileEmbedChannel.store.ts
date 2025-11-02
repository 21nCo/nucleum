import { EmbedDataMessage } from "@21n/types/embedMessage.enum";
import { postDataToParent } from "@21n/utils/embed.utils";
import { wait } from "@21n/utils/time.utils";
import { type IFileEmbedChannel } from "@21n/components/files/file.type";
import { get, writable } from "svelte/store";

const subject = writable<IFileEmbedChannel>({ files: [] });

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
};

export const fileEmbedChannel = {
  get: () => get(subject),
  subscribe: subject.subscribe,
  update: subject.update,
  set: subject.set,
  async fetch(url: string, id: string) {
    const currentStore = get(subject);
    let file = currentStore.files.find((f) => f.id === id);
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
      const latestStore = get(subject);
      file = latestStore.files.find((f) => f.id === id);
      if (file) {
        isDataReceived = true;
        break;
      }
      await wait(500);
      timeElapsed += 500;
    }

    if (!file) return;
    return file.data;
  },

  downloadFromUrl(url: string, fileName?: string) {
    postDataToParent(EmbedDataMessage.DOWNLOAD, {
      url: url.toString(),
      filename: fileName
    });
  },

  download(data: string, contentType: string) {
    postDataToParent(EmbedDataMessage.DOWNLOAD, {
      data,
      contentType
    });
  },

  setFile(id: string, data: string) {
    const currentStore = get(subject);
    const files = currentStore.files.filter((f) => f.id !== id);
    files.push({ id, data });
    subject.set({ files });
  },

  base64ToUint8Array,
  /**
   * TODO - use ui.utils.ts base64ToBlob instead
   * */
  base64ToBlob(base64: string, type: string): Blob {
    const uint8Array = base64ToUint8Array(base64);
    const arrayBuffer = uint8Array.buffer.slice(0) as ArrayBuffer;
    return new Blob([arrayBuffer], { type });
  }
};
