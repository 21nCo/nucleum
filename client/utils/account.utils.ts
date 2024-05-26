import { Item } from "$lib/client/types/item.enum";
import { retrieveLocally } from "$lib/client/utils/storage.utils";

export function resolveToken() {
  let token: string | null = null;
  const space = retrieveLocally(Item.spaceInContext);
  if (space?.id) {
    token = localStorage?.getItem(`token-${space.id}`);
  } else token = localStorage?.getItem("surreal-token");
  return token;
}
