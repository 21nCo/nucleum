import type { Placement } from "$lib/client/types/placement.type";
import type { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";

export type NavigationMenuItem = {
  label: string;
  link: string;
  icon?: string;
  iconPlacement?: Placement.LEFT | Placement.RIGHT;
  style?: SelectionItemActiveStyle;
};
