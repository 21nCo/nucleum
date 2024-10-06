import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { logger } from "../components/debug/logger.client";
import { ClientStorageKey } from "../persistence/persistence.type";
import {
  clientStorage,
  retrieveLocally
} from "../persistence/persistence.utils";
import { goto, isExtensionEnvironment } from "./browser.utils";
import { postToParent } from "./embed.utils";

export async function resolveToken(): Promise<string | null> {
  let token: string | null = null;
  if (isExtensionEnvironment()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(ClientStorageKey.STOKEN, function (data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          // console.log("Token retrieved is: " + data.stoken);
          resolve(data.stoken);
        }
      });
    });
  } else {
    const space = retrieveLocally(Resource.spaceInContext);
    if (space?.id) {
      token = localStorage?.getItem(`token-${space.id}`);
    } else token = localStorage?.getItem("stoken");
  }
  return token;
}

export async function resolveCurrentUserId() {
   if (isExtensionEnvironment()) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(ClientStorageKey.USER_INFO, function (data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (data.userInfo) {
          const id = JSON.parse(data.userInfo)?.id;
          resolve(id);
        } else {
          resolve(null);
        }
      });
    });
   } else {
    const userInfo = localStorage.getItem("userInfo");
     if (userInfo) return JSON.parse(userInfo)?.id;
  }
}

export function signout(ctx: string = "") {
  logger.log({ at: "signout", context: ctx });
  clientStorage.remove(ClientStorageKey.STOKEN);
  clientStorage.remove(ClientStorageKey.USER_INFO);
  clientStorage.remove(ClientStorageKey.OFFLINE_SESSION_ID);
  postToParent({
    account: JSON.stringify({
      isLoggedIn: false
    })
  });
  goto("/signup?msg=signedout");
}
