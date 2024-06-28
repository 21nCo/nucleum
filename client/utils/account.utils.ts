import { goto } from "$app/navigation";
import { Item } from "$lib/client/types/item.enum";
import { retrieveLocally } from "$lib/client/utils/storage.utils";
import { postToParent } from "./embed.utils";

export function resolveToken() {
  let token: string | null = null;
  const space = retrieveLocally(Item.spaceInContext);
  if (space?.id) {
    token = localStorage?.getItem(`token-${space.id}`);
  } else token = localStorage?.getItem("surreal-token");
  return token;
}

export function signout(ctx: string = "") {
  localStorage.removeItem("surreal-token");
  localStorage.removeItem("userInfo");
  localStorage.removeItem("isOnboardingComplete");
  postToParent({
    account: JSON.stringify({
      isLoggedIn: false
    })
  });
  goto("/signup?msg=signedout");
}
