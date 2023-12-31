import { get } from "svelte/store";
import {
  account,
  appStore,
  isRefreshingToken,
  userPreferences,
  windowObject,
} from "../stores/app.store";
import { wait } from "./time.utils";
import jwt_decode from "jwt-decode";
import { Persistance } from "../stores/persistance";
import { resolveUiState } from "./utils";
import { UiState } from "../types/uiState.enum";

export async function performRedirectionChecks() {
  const isOnboardingComplete = await onBoardingStatusCheck();
  if (!isOnboardingComplete) return false;
  return await performLoginStatusCheck();
}

export async function performLoginStatusCheck() {
  const token = localStorage.getItem("surreal-token");
  if (!token) {
    windowObject.gotoPath("/signup");
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
    windowObject.gotoPath("/signup?msg=expired");
    return false;
  } else return true;
}

export async function onBoardingStatusCheck() {
  if (
    resolveUiState(get(userPreferences).uiStates, UiState.isOnboardingComplete)
  )
    return true;
  else {
    windowObject.gotoPath("/onboarding");
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

export async function runBackendUpdate() {
  return new Persistance().updateDefinitions();
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
      await runBackendUpdate();
      return true;
    } else if (appVersionOnClient != latestVersion) {
      localStorage.setItem("appVersion", latestVersion);
      runClientUpdate();
      return true;
    }
  } catch (e) {
    appStore.logError(e);
  }
  return false;
}
