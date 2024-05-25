import { Item } from "$lib/client/types/item.enum";
import { get } from "svelte/store";
import {
  appStore,
  isRefreshingToken,
  userPreferences
} from "../stores/app.store";
import account from "$lib/client/stores/account.store";
import { wait } from "./time.utils";
import jwt_decode from "jwt-decode";
import { Persistance, retrieveLocally } from "../stores/persistance";
import { resolveUiState } from "./utils";
import { UiState } from "$lib/client/types/uiState.enum";
import { logger } from "../stores/log.store";

export async function performRedirectionChecks() {
  return await performLoginStatusCheck();
}

export async function performLoginStatusCheck() {
  const token = localStorage.getItem("surreal-token");
  if (!token) {
    appStore.gotoPath("/signup");
    return false;
  }
  let isSessionExpiredOrRefreshing = await checkIfSessionExpired();
  if (isSessionExpiredOrRefreshing && get(isRefreshingToken)) {
    while (get(isRefreshingToken)) {
      await wait(1000);
    }
  }
  isSessionExpiredOrRefreshing = await checkIfSessionExpired();
  if (isSessionExpiredOrRefreshing) {
    appStore.gotoPath("/signup?msg=expired");
    return false;
  } else return true;
}

export async function onBoardingStatusCheck() {
  if (
    resolveUiState(get(userPreferences).uiStates, UiState.isOnboardingComplete)
  )
    return true;
  else {
    appStore.gotoPath("/onboarding");
    return false;
  }
}

async function checkIfSessionExpired() {
  const token = localStorage.getItem("surreal-token");
  if (!token) {
    account.expire();
    return true;
  }
  let decodedToken: any = jwt_decode(token);
  let exp = decodedToken?.exp ?? 0;
  const currentTime = new Date().getTime() / 1000;
  //console.log({ currentTime, exp });
  if (currentTime < exp) {
    return false;
  }
  console.log("token expired");
  const refreshToken = localStorage.getItem("refresh-token");
  if (!refreshToken) {
    account.expire();
    return true;
  }
  let decodedRefreshToken: any = jwt_decode(refreshToken);
  let refreshExp = decodedRefreshToken?.exp ?? 0;
  if (currentTime > refreshExp) {
    account.expire();
    return true;
  }
  if (!get(isRefreshingToken)) {
    account.expire();
    return true;
    //TODO - not refreshing token as refresh token logic is not robust on the backend and also refreshToken - CORS config is not added on backend which is causing issues
    console.log("refreshing token");
    isRefreshingToken.set(true);
    const response = await new Persistance().refreshToken();
    if (response) {
      isRefreshingToken.set(false);
      return false;
    } else {
      isRefreshingToken.set(false);
      return true;
    }
  } else {
    return true;
  }
}

export async function runDboUpdate(
  fromVersion: number | undefined = undefined
) {
  return new Persistance().updateDbo(fromVersion);
}
export async function ping() {
  return new Persistance().ping();
}

function runClientUpdate() {
  console.log("running client update");
  //todo - show user a message that an update is available - auto updating for now
  window?.location?.reload();
}

export async function checkForUpdates(
  latestVersion: string | undefined = undefined
) {
  console.log("checking for updates");
  try {
    if (!latestVersion) {
      const app = import.meta.env.VITE_APP ?? window.location.hostname;
      if (!app) return;
      latestVersion = await new Persistance().getLatestAppVersion(app);
    }
    if (!latestVersion) return;
    const appVersionOnClient = localStorage.getItem("appVersion");
    if (!appVersionOnClient) {
      localStorage.setItem("appVersion", latestVersion);
      await runDboUpdate();
      return true;
    } else if (appVersionOnClient != latestVersion) {
      localStorage.setItem("appVersion", latestVersion);
      runClientUpdate();
      return true;
    }
  } catch (e) {
    logger.logError(e);
  }
  return false;
}

export function resolveToken() {
  let token: string | null = null;
  const space = retrieveLocally(Item.spaceInContext);
  if (space?.id) {
    token = localStorage?.getItem(`token-${space.id}`);
  } else token = localStorage?.getItem("surreal-token");
  return token;
}
