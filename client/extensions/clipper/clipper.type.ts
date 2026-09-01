import type { OmitForCapture } from "@21n/components/flux/resourceStores/resource.type";
import type {
  INode,
  IVideoBookmarkCapture,
  IWebPage
} from "@21n/products/memotron/node/node.type";

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
