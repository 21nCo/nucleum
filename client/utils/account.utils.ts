import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { logger } from "../components/debug/logger.client";
import { ClientStorageKey } from "../persistence/persistence.type";
import { goto, isExtensionEnvironment } from "./browser.utils";
import {
  clientStorage,
  retrieveLocally
} from "../persistence/persistence.utils";
import { postToParent } from "./embed.utils";
import { LicenseType, type IUserPlan } from "../types/account.type";
import jwt_decode from "jwt-decode";
import { PlanType } from "../components/subscription/userPlan.type";
import { formatDate } from "./time.utils";
import { enumToString } from "$lib/shared/utils/text.utils";

export function getBucketNameandKey(url: string) {
  const urlParts = url.split("/");
  const bucketName = urlParts[3];
  const userId = urlParts[4];
  const directory = urlParts[5];
  let fileName = urlParts[6];
  if (fileName.includes("?") || fileName.includes("%")) {
    fileName = urlParts[6].split("?")[0];
    // fileName = fileName.split("%")[0];
  }
  return `${bucketName}/${userId}/${directory}/${fileName}`;
}

export function isUrlExpired(signedUrl: string) {
  const params = new URLSearchParams(signedUrl);
  const amzDate = params.get("X-Amz-Date");
  const amzExpires = params.get("X-Amz-Expires");

  if (amzDate && amzExpires) {
    const date = new Date(
      Date.UTC(
        parseInt(amzDate.substring(0, 4)),
        parseInt(amzDate.substring(4, 6)) - 1,
        parseInt(amzDate.substring(6, 8)),
        parseInt(amzDate.substring(9, 11)),
        parseInt(amzDate.substring(11, 13)),
        parseInt(amzDate.substring(13, 15))
      )
    );

    const expiresInSeconds = parseInt(amzExpires, 10);
    const expirationDate = new Date(date.getTime() + expiresInSeconds * 1000);
    const currentDate = new Date();
    return expirationDate < currentDate;
  }
}
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
    const userInfo =
      typeof window !== "undefined"
        ? localStorage.getItem("userInfo")
        : undefined;
    if (userInfo) return JSON.parse(userInfo)?.id;
  }
}

export async function signout(
  params?: { isPreventDapIdClear?: boolean; isPreventRedirect?: boolean },
  ctx?: string
) {
  logger.log({ at: "signout", context: ctx, params });
  postToParent({
    account: JSON.stringify({
      isLoggedIn: false
    })
  });
  await clearLocalStorage(params);
  if (!params?.isPreventRedirect) goto("/signup?msg=signedout");
  async function clearLocalStorage(params?: { isPreventDapIdClear?: boolean }) {
    const env = await clientStorage.get(ClientStorageKey.ENV);
    const appData = await clientStorage.get(ClientStorageKey.APP_DATA);
    const product = await clientStorage.get(ClientStorageKey.PRODUCT);
    const dapId = params?.isPreventDapIdClear
      ? await clientStorage.get(ClientStorageKey.DAP_ID)
      : undefined;
    await clientStorage.clearAll();
    if (env) await clientStorage.set(ClientStorageKey.ENV, env);
    if (product) await clientStorage.set(ClientStorageKey.PRODUCT, product);
    if (appData) await clientStorage.set(ClientStorageKey.APP_DATA, appData);
    if (dapId) await clientStorage.set(ClientStorageKey.DAP_ID, dapId);
  }
}

export function resolveLicenseString(userInfo: any) {
  if (userInfo?.licenseType) {
    switch (userInfo?.licenseType) {
      case LicenseType.EA_LIFETIME:
        return "Early Adopter - lifetime license";
      case LicenseType.EA_EXTENDED:
        return "Early Adopter - 2 years extended trial";
      case LicenseType.FREE:
        return "Free plan";
    }
  } else if (userInfo?.joinDate) {
    const joinDate = new Date(userInfo?.joinDate);
    const joinDateIsBeforeJan012024 = joinDate < new Date(2024, 1, 1);
    const joinDateIsBeforeNov132024 = joinDate < new Date(2024, 10, 13);
    const joinDateIsBeforeNov182024 = joinDate < new Date(2024, 10, 18);
    const joinDateIsBeforeDec012024 = joinDate < new Date(2024, 11, 1);
    if (joinDateIsBeforeJan012024) {
      return "Early Adopter - lifetime license";
    } else if (joinDateIsBeforeNov132024) {
      return "1 year free cloud sync 🎉 (First 500 early adopters)";
    } else if (joinDateIsBeforeNov182024) {
      return "4 mo free cloud sync 🎉 (First 1000 early adopters)";
    } else if (joinDateIsBeforeDec012024) {
      return "2 mo free cloud sync 🎉 (First 5000 users)";
    } else {
      return "Early Adopter - limited free cloud sync trial";
    }
  }
}

export function isTokenExpired(token: string) {
  const decoded: any = jwt_decode(token);
  const exp = decoded.exp ?? 0;
  const currentTime = Math.floor(Date.now() / 1000);
  return exp < currentTime;
}

export function resolvePlanLabel(plan: IUserPlan | undefined) {
  if (!plan || !plan.plan) return "Unknown plan";
  if (plan.plan === PlanType.TRIAL) {
    const isActive = determineIfPlanIsActive(plan);
    if (!isActive) {
      return `Free trial expired - Please upgrade`;
    } else if (plan.trialPlan?.expiry) {
      return `Free trial - expires ${formatDate(
        new Date(plan.trialPlan?.expiry)
      )}`;
    } else {
      return `Free trial`;
    }
  } else if (
    plan.plan === PlanType.NUCLEUS ||
    plan.plan === PlanType.CLOUD_SYNC
  ) {
    if (plan.isCancelled) {
      return `Plan cancelled`;
    } else if (plan.billingErrors) {
      return `Billing issue`;
    } else {
      return `${enumToString(plan.plan)} - ${plan.billingCycle} plan 🎉`;
    }
  } else {
    return `Unknown plan`;
  }
}

export function determineIfPlanIsActive(plan: IUserPlan) {
  if (plan.plan === PlanType.TRIAL && plan.trialPlan?.expiry) {
    const isExpired =
      new Date(plan.trialPlan.expiry).getTime() < new Date().getTime();
    return !isExpired;
  } else if (
    (plan.plan === PlanType.CLOUD_SYNC || plan.plan === PlanType.NUCLEUS) &&
    plan.billingErrors
  ) {
    return false;
  } else if (plan.isCancelled) {
    return false;
  }
  return true;
}
