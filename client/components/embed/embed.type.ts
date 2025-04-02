import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { EmbedMessage } from "$lib/client/types/embedMessage.enum";
export type IEmbedChannel = IObservableStoreSubject & {
  data: IEmbedChannelData[];
};

export type IEmbedChannelData = {
  id: string;
  type: EmbedMessage;
  data: any;
};
