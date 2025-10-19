import type { IActiveResource } from "@21n/components/flux/resourceStores/resource.type";
import type { IMemotronItemBase } from "@21n/products/memotron/memotron.type";

type ICombinationBase = IMemotronItemBase & {
  type: CombinationType;
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
