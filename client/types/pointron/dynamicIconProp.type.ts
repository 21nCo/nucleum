import type { IconVariant } from "$lib/client/types/icon.type";

export type DynamicIconProp = {
  name: string;
  variant?: IconVariant;
  color?: string;
  active?: boolean;
  activeColor?: string;
  class?: string;
  customPath?: string;
};
