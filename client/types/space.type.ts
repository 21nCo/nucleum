import type { ICacheableStore } from "$lib/client/types/data.type";

export type SpaceStore = ICacheableStore & {
  spaces: Space[];
};

export type Space = {
  id: string;
  label: string;
  slug: string;
};
