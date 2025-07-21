import type { EmbedMessage } from "$lib/client/types/embedMessage.enum";
export type IEmbedChannel = {
  [key: string]: IEmbedChannelData;
};

export type IEmbedChannelData = {
  type: EmbedMessage;
  data: any;
};
