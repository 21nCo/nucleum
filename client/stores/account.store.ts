import { get, writable } from "svelte/store";
import {
  UserSessionType,
  type UserAccount,
  type UserInformation
} from "../types/account.type";
import { postToParent } from "$lib/client/utils/embed.utils";
import { GlobalEvent } from "../types/event.enum";
import { Persistence } from "../persistence/persistence";
import { ButtonVariant } from "../types/button.type";
import { performApiCall } from "$lib/client/utils/network.utils";
import {
  confirmationNotification,
  appEvents
} from "$lib/client/stores/notification.store";
import { appStore, userPreferences } from "./app.store";
import jwt_decode from "jwt-decode";
import { wait } from "../utils/time.utils";
import { signout } from "../utils/account.utils";
import { ObservableStore } from "./client.store";
import {
  StoreDataType,
  type IObservableStoreSubject
} from "$lib/client/types/data.type";
import { dataManager } from "../persistence/dataManager";
import posthog from "posthog-js";
import { clientStorage } from "../persistence/persistence.utils";
import { ClientStorageKey } from "../persistence/persistence.type";
import { logger } from "../components/debug/logger.client";
import { flux } from "../persistence/dataManagerv2";
import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";

export const isRefreshingToken = writable(false);

class AccountStore extends ObservableStore<
  UserAccount & IObservableStoreSubject
> {
  persistence = new Persistence();
  constructor() {
    super("account", StoreDataType.NA);
    let seed: UserAccount = {
      sessionType: UserSessionType.NONE
    };
    const token = clientStorage.get(ClientStorageKey.STOKEN);
    const offlineSessionId = clientStorage.get(
      ClientStorageKey.OFFLINE_SESSION_ID
    );
    if (token) {
      seed.token = token;
      seed.sessionType = UserSessionType.CLOUD;
    } else if (offlineSessionId) {
      seed.sessionType = UserSessionType.LOCAL;
    }
    const userInfo = clientStorage.get(ClientStorageKey.USER_INFO);
    if (userInfo) {
      seed.userInfo = JSON.parse(userInfo ?? "");
    }
    this.set(seed);
    this.postToEmbed(seed);
  }

  postToEmbed(data: any = null) {
    if (!data) {
      const token = clientStorage.get(ClientStorageKey.STOKEN);
      const userInfo = JSON.parse(
        clientStorage.get(ClientStorageKey.USER_INFO) ?? ""
      );
      data = { token, userInfo };
    }
    if (!data) return;
    postToParent({
      account: JSON.stringify({
        userId: data.userInfo?.id?.split("user:")[1],
        token: data.token,
        refreshToken: data.refreshToken,
        isLoggedIn: true
      })
    });
  }

  expire() {
    logger.log({ at: "account.store - Expiring account" });
    clientStorage.remove(ClientStorageKey.STOKEN);
    this.update(() => {
      const n = {
        sessionType: UserSessionType.NONE
      };
      return n;
    });
    appEvents.publish(GlobalEvent.USER_LOGIN, false);
  }

  signIn(
    data: {
      userInfo: UserInformation;
      token: string;
      refreshToken?: string;
    },
    params: {
      isIgnoreRefresh?: boolean;
      redirectTo?: string;
    } = { isIgnoreRefresh: false }
  ) {
    console.log("signing in", { data });
    clientStorage.set(ClientStorageKey.STOKEN, data.token);
    clientStorage.set(
      ClientStorageKey.USER_INFO,
      JSON.stringify(data.userInfo)
    );
    localStorage.setItem("refresh-token", data.refreshToken ?? "");
    this.postToEmbed(data);
    this.update(() => {
      return {
        token: data.token,
        sessionType: UserSessionType.CLOUD,
        userId: data.userInfo.id,
        userInfo: data.userInfo
      };
    });
    if (!params.isIgnoreRefresh && data.userInfo.isBootstrapped) {
      appEvents.publish(GlobalEvent.USER_LOGIN, true);
      appStore.gotoPath("/");
    } else if (!data.userInfo.isBootstrapped) {
      appStore.gotoPath("/bootstrap");
    } else {
      appStore.gotoPath(params.redirectTo ?? "/");
    }
  }

  signOut() {
    this.expire();
    signout("signOut account.store");
    this.clearAllCache();
  }
  async embedOAuthSignin(token: string) {
    clientStorage.set(ClientStorageKey.STOKEN, token);
    let response = await this.persistence.getUserInfo(token);
    if (response?.userInfo) {
      await this.signIn({
        userInfo: response?.userInfo,
        token: token,
        refreshToken: token
      });
    } else {
      console.log("error", response);
    }
  }

  delete() {
    confirmationNotification.notify({
      title: "Account deletion confirmation",
      message: "Are you sure you want to delete your account?",
      confirmAction: {
        label: "Delete",
        variant: ButtonVariant.DANGER,
        callback: async () => {
          return account.confirmDelete();
        }
      }
    });
  }

  async confirmDelete() {
    let acc = get(account);
    await performApiCall("account/n/deleteAccount", "POST", {});
    console.log("deleting account", { acc });
    account.signOut();
    appStore.gotoPath("/signup?msg=deleted");
    return true;
  }

  performRedirectionCheck() {
    return this.performLoginStatusCheck();
  }

  ping() {
    this.postToEmbed();
    return this.persistence.ping();
  }
  async logGuest() {
    let id = clientStorage.get(ClientStorageKey.GUEST);
    if (!id) {
      id = generateSimpleRandomId();
      clientStorage.set(ClientStorageKey.GUEST, id);
    }
    try {
      await this.persistence.runAccountAction("guest", { id });
    } catch (e) {
      logger.error({ at: "logGuest", error: e });
    }
    return id;
  }

  async startOfflineSession() {
    this.update((n) => {
      n.sessionType = UserSessionType.LOCAL;
      return n;
    });
    clientStorage.set(
      ClientStorageKey.OFFLINE_SESSION_ID,
      generateSimpleRandomId()
    );
    await this.seed();
  }

  async bootstrap(region: string) {
    await this.bootstrapRemote(region);
    await this.seed();
  }

  async bootstrapRemote(region: string) {
    const id = this.get()?.userInfo?.id?.split("user:")[1];
    if (!id) return;
    const response = await this.persistence.runAccountAction("bootstrap", {
      id,
      region
    });
    if (!response || response.error || !response.userInfo) return;
    this.signIn(
      {
        userInfo: response.userInfo,
        token: response.token
      },
      {
        isIgnoreRefresh: true,
        redirectTo: "/onboarding"
      }
    );
    appEvents.publish(GlobalEvent.BOOTSTRAP, true);
    this.setAnalyticsUserIdentity();
    // await dataManager.bootstrap();
    return true;
  }

  async seed() {
    await flux.seed();
    await userPreferences.initializeTimeZoneForSignup();
  }

  async performLoginStatusCheck() {
    const token = clientStorage.get(ClientStorageKey.STOKEN);
    const offlineSessionId = clientStorage.get(
      ClientStorageKey.OFFLINE_SESSION_ID
    );
    if (!token && !offlineSessionId) {
      console.log("Token not found. Redirecting to signup");
      appStore.gotoPath("/signup");
      return false;
    }
    let isSessionExpiredOrRefreshing = await this.checkIfSessionExpired();
    if (isSessionExpiredOrRefreshing && get(isRefreshingToken)) {
      while (get(isRefreshingToken)) {
        await wait(1000);
      }
    }
    isSessionExpiredOrRefreshing = await this.checkIfSessionExpired();
    if (isSessionExpiredOrRefreshing) {
      appStore.gotoPath("/signup?msg=expired");
      return false;
    } else return true;
  }

  getSignedUrl(contentType: string, fileName: string, isTemp: boolean) {
    const acc = get(account);
    const userId = acc.userInfo?.id.split(":")[1] ?? "";
    return this.persistence.getSignedUrl(userId, contentType, fileName, isTemp);
  }

  async uploadFile(
    contentType: string,
    fileName: string,
    blob: any,
    isTemp: boolean = false
  ) {
    const signedUrlResponse = await this.getSignedUrl(
      contentType,
      fileName,
      isTemp
    );
    if (signedUrlResponse?.uploadURL) {
      await this.persistence.uploadFile(
        signedUrlResponse.uploadURL,
        contentType,
        blob
      );
      return signedUrlResponse;
    } else return null;
  }

  /**
   * Used to upload a file to s3 temp bucket
   * @param input the file that needs to be uploaded to the S3 temp bucket
   */
  async tempUploadToS3(input: any) {
    let itemLocalURL = new Blob([input], { type: input.type });
    let customName = input.name.split(".")[0].replace(/\s+/g, "");
    const result = await this.uploadFile(
      input.type,
      customName,
      itemLocalURL,
      true
    );
    let url = result.uploadURL.split("?")[0];
    return [url, customName, itemLocalURL];
  }

  async checkIfSessionExpired() {
    const token = clientStorage.get(ClientStorageKey.STOKEN);
    const offlineSessionId = clientStorage.get(
      ClientStorageKey.OFFLINE_SESSION_ID
    );
    if (!token && !offlineSessionId) {
      this.expire();
      return true;
    }
    if (offlineSessionId) {
      return false;
    }
    if (!token) return true;
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
      this.expire();
      return true;
    }
    let decodedRefreshToken: any = jwt_decode(refreshToken);
    let refreshExp = decodedRefreshToken?.exp ?? 0;
    if (currentTime > refreshExp) {
      this.expire();
      return true;
    }
    if (!get(isRefreshingToken)) {
      this.expire();
      return true;
      //TODO - not refreshing token as refresh token logic is not robust on the backend and also refreshToken - CORS config is not added on backend which is causing issues
      console.log("refreshing token");
      isRefreshingToken.set(true);
      const response = await this.persistence.refreshToken();
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
  clearAllCache() {
    const env = clientStorage.get(ClientStorageKey.ENV);
    const appData = clientStorage.get(ClientStorageKey.APP_DATA);
    const product = clientStorage.get(ClientStorageKey.PRODUCT);
    const guest = clientStorage.get(ClientStorageKey.GUEST);
    clientStorage.clearAll();
    get(dataManager)?.cacheSource?.clearCache();
    if (env) clientStorage.set(ClientStorageKey.ENV, env);
    if (product) clientStorage.set(ClientStorageKey.PRODUCT, product);
    if (appData) clientStorage.set(ClientStorageKey.APP_DATA, appData);
    if (guest) clientStorage.set(ClientStorageKey.GUEST, guest);
  }

  setAnalyticsUserIdentity() {
    const account = this.get();
    if (!account.userInfo) return;
    posthog.identify(account.userInfo.id, {
      region: account.userInfo.region
    });
  }
}

const account = new AccountStore();
export default account;
