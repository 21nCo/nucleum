import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { IClip } from "$lib/client/types/memotron/clip.type";
export interface IContentScriptStore extends IObservableStoreSubject {
  url: string;
  id?: string;
  clips?: IClip[]
  links?: any
}
