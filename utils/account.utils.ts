import { get } from "svelte/store";
import {
  account,
  appStore,
  isOnboardingComplete,
  isRefreshingToken,
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
  const isValid = await loginStatusCheck();
  if (!isValid) return false;
  isOnboardingComplete.check();
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

export async function checkForUpdates() {
  console.log("checking for updates");
  const appVersionOnClient = localStorage.getItem("appVersion");
  const currentVersion = get(appStore).appData.version;
  if (!appVersionOnClient) {
    localStorage.setItem("appVersion", currentVersion);
  } else if (appVersionOnClient != currentVersion) {
    await new Persistance().updateDefinitions();
    localStorage.setItem("appVersion", currentVersion);
    window?.location?.reload();
  }
}
