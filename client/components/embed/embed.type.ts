import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { EmbedMessage } from "$lib/client/types/embedMessage.enum";
export type IEmbedChannel = IObservableStoreSubject & {
  [key: string]: IEmbedChannelData;
};

export type IEmbedChannelData = {
  type: EmbedMessage;
  data: any;
};
