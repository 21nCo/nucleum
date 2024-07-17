import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { IClip } from "$lib/client/types/memotron/clip.type";
import type { INodeProperty } from "$lib/client/types/memotron/node.type";
export interface IWebpage extends IObservableStoreSubject {
  url: string;
  id?: string;
  clips?: IClip[]
  links?: string[]
  properties?: INodeProperty[]
  notes?: string
  relationships?: { node: string, relation: string }[]
}
