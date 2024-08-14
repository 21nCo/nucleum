import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { IClip } from "$lib/client/products/memotron/common/clip.type";
import type { INodeProperty } from "$lib/client/products/memotron/node/node.type";
export interface IWebpage extends IObservableStoreSubject {
  url: string;
  id?: string;
  clips?: IClip[];
  links?: string[];
  properties?: INodeProperty[];
  notes?: string;
  relationships?: { node: string; relation: string }[];
}

export interface IArea{
  x: number;
  y: number;
  width: number;
  height: number;
}

export type IImageElement= { src: string; alt: string }