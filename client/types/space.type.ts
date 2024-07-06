import type { IStore } from "$lib/client/types/data.type";

export type SpaceStore = IStore & {
  spaces: Space[];
};

export type Space = {
  id: string;
  label: string;
  slug: string;
};
