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

export async function loginStatusCheck() {
  const token = localStorage.getItem("surreal-token");
  if (!token) {
    windowObject.gotoPath("/signup");
    return false;
  }
  let isSessionExpired = await checkIfSessionExpired();
  if (isSessionExpired && get(isRefreshingToken)) {
    while (get(isRefreshingToken)) {
      await wait(1000);
    }
  }
  isSessionExpired = await checkIfSessionExpired();
  if (isSessionExpired) {
    windowObject.gotoPath("/expired");
    return false;
  } else return true;
}

export async function onBoardingStatusCheck() {
  if (get(userPreferences).uiState?.isOnboardingComplete) return true;
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
      account.expire();
      return true;
    }
  }
}

export async function checkForUpdates(
  latestVersion: string | undefined = undefined
) {
  console.log("checking for updates");
  if (!latestVersion) {
    const app = import.meta.env.VITE_APP ?? window.location.hostname;
    if (!app) return;
    latestVersion = await new Persistance().getLatestAppVersion(app);
  }
  if (!latestVersion) return;
  const appVersionOnClient = localStorage.getItem("appVersion");
  if (!appVersionOnClient) {
    localStorage.setItem("appVersion", latestVersion);
  } else if (appVersionOnClient != latestVersion) {
    await new Persistance().updateDefinitions();
    localStorage.setItem("appVersion", latestVersion);
    window?.location?.reload();
  }
}
