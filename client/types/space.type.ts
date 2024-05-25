import type { CacheableStore } from "$lib/client/types/data.type";

export type SpaceStore = CacheableStore & {
  spaces: Space[];
};

export type Space = {
  id: string;
  label: string;
  slug: string;
};
