import type { IActiveResource } from "$lib/client/components/flux/resourceStores/resource.type";
import type { IMemotronItemBase } from "$lib/client/products/memotron/memotron.type";
import type { IRecordId } from "$lib/client/types/data.type";

export interface ICombinationItem {
  id: IRecordId;
  customLabel?: string;
  children?: ICombinationItem[];
  position?: {
    x: number;
    y: number;
    z?: number;
  };
  size?: {
    width: number;
    height: number;
  };
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
  };
}

type ICombinationBase = IMemotronItemBase & {
  type: CombinationType;
  items?: ICombinationItem[];
  config?: {
    sideNavWidth?: number;
    canvasScale?: number;
    canvasOffset?: { x: number; y: number };
    mindmapScale?: number;
    mindmapOffset?: { x: number; y: number };
    expandedNodes?: string[];
    [key: string]: any;
  };
};

export type ICombination = ICombinationBase;

export type IActiveCombination = IActiveResource & ICombination;

export type ICombinationThumb = ICombinationBase;

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
