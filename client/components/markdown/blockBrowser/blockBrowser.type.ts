import type { NodeType } from "$lib/client/products/memotron/node/node.type";
import type { InlineType } from "$lib/client/components/markdown/md.type";

export type IBlockBrowserItem = {
  label: string;
  type: NodeType | InlineType;
  icon: string;
  description?: string;
  badge?: string;
  isDisabled?: boolean;
  tooltip?: string;
};

export type IBlockBrowserSection = {
  section: string;
  children: IBlockBrowserItem[];
  isDisabled?: boolean;
  badge?: string;
};
