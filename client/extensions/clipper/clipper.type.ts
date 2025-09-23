import type { OmitForCapture } from "$lib/client/components/flux/resourceStores/resource.type";
import type {
  INode,
  IVideoBookmarkCapture,
  IWebPage
} from "$lib/client/products/memotron/node/node.type";

export type ISocialPostParser = (
  target: HTMLElement
) => ISocialPost | undefined;

export type IVideoBookmarkParser = () => IVideoBookmarkCapture | null;

export type IWebpageParser = () =>
  | OmitForCapture<IWebPage>
  | ISocialPost
  | undefined;

export type ISocialPost<T = INode, U = INode, V = INode> = ISocialPostBase<
  T,
  U,
  V
> & {
  isPostPage?: boolean;
};

export type ISocialPostBase<T, U, V = undefined> = {
  data: OmitForCapture<T>;
  parent: OmitForCapture<U>;
  sub?: OmitForCapture<V>;
};
