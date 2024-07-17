import { Item } from "$lib/client/types/item.enum";
import { retrieveLocally } from "$lib/client/utils/storage.utils";
import { goto, isExtensionEnvironment } from "./browser.utils";
import { postToParent } from "./embed.utils";

export async function resolveToken(): Promise<string | null> {
  let token: string | null = null;
  const space = retrieveLocally(Item.spaceInContext);
  if (space?.id) {
    token = localStorage?.getItem(`token-${space.id}`);
  } else token = localStorage?.getItem("stoken");
  if (!token && isExtensionEnvironment()) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get("stoken", function (data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          // console.log("Token retrieved is: " + data.stoken);
          resolve(data.stoken);
        }
      });
    });
  }
  return token;
}

export async function resolveCurrentUserId() {
  const userInfo = localStorage.getItem("userInfo");
  if (userInfo) return JSON.parse(userInfo)?.id;
  else if (isExtensionEnvironment()) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get("userInfo", function (data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          const id = JSON.parse(data.userInfo)?.id;
          resolve(id);
        }
      });
    });
  }
}

export function signout(ctx: string = "") {
  console.log("Signing out", { ctx });
  localStorage.removeItem("stoken");
  localStorage.removeItem("userInfo");
  localStorage.removeItem("isOnboardingComplete");
  postToParent({
    account: JSON.stringify({
      isLoggedIn: false
    })
  });
  goto("/signup?msg=signedout");
}
