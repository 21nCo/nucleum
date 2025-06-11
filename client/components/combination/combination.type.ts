import type { IActiveResource } from "$lib/client/components/flux/resourceStores/resource.type";
import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import type { IRecordId } from "$lib/client/types/data.type";

type ICombinationBase = IMemotronItemBase & {
  type: CombinationType;
  items?: IRecordId[];
  config?: {
    sideNavWidth?: number;
    [key: string]: any;
  };
};

export type ICombination = ICombinationBase;

export type IActiveCombination = IActiveResource & ICombination;

export enum CombinationType {
  SIDENAV = "sidenav",
  WHITEBOARD = "whiteboard",
  MINDMAP = "mindmap",
  WALL = "wall",
  /**
   * Previous - Pyramid, Funnel views merged into regular timeline view.
   */
  TIMELINE = "timeline"
}
