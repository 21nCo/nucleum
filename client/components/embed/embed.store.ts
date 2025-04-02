import { ObservableStore } from "$lib/client/stores/client.store";
import type { EmbedMessage } from "$lib/client/types/embedMessage.enum";
import { postToParent } from "$lib/client/utils/embed.utils";
import { wait } from "$lib/client/utils/time.utils";
import type { IEmbedChannel, IEmbedChannelData } from "./embed.type";

class EmbedChannelStore extends ObservableStore<IEmbedChannel> {
  constructor() {
    super("embedChannel");
    this.set({ data: [] });
  }

  async fetch(id: string, type: EmbedMessage, body: any) {
    const store = this.get();
    let item = store.data.find((d: IEmbedChannelData) => d.id === id);
    if (item) return item.data;

    postToParent({
      data: JSON.stringify({ id, type, body })
    });

    let isDataReceived = false;
    let timeElapsed = 0;
    while (!isDataReceived) {
      if (timeElapsed > 5000) {
        throw new Error("Timeout waiting for data");
      }
      const store = this.get();
      item = store.data.find((d: IEmbedChannelData) => d.id === id);
      if (item) {
        isDataReceived = true;
        break;
      }
      await wait(500);
      timeElapsed += 500;
    }

    if (!item) return;
    return item.data;
  }

  setData(id: string, type: EmbedMessage, data: any) {
    const store = this.get();
    const dataItems = store.data.filter((d: IEmbedChannelData) => d.id !== id);
    dataItems.push({ id, type, data });
    this.set({ data: dataItems });
  }
}

export const embedChannel = new EmbedChannelStore();
