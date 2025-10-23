import type { IStore } from "@21n/types/data.type";

export type SpaceStore = IStore & {
  spaces: Space[];
};

export type Space = {
  id: string;
  label: string;
  slug: string;
};
