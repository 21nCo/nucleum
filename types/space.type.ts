import type { CacheableStore } from "$lib/tidy/types/data.type";

export type SpaceStore = CacheableStore & {
  spaces: Space[];
};

export type Space = {
  id: string;
  label: string;
  slug: string;
};
