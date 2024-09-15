import { get, writable } from "svelte/store";
import {
  UserDataMode,
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
import { appStore } from "./app.store";
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
import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
import { fileStore } from "../components/files/file.store";
import { flux } from "../components/flux/flux";

export const isRefreshingToken = writable(false);

class AccountStore extends ObservableStore<
  UserAccount & IObservableStoreSubject
> {
  persistence = new Persistence();
  constructor() {
    super("account", StoreDataType.NA);
  }

  async init() { 
    let seed: UserAccount = {
      dataMode: UserDataMode.NONE,
      sessionType: UserSessionType.UNDETERMINED
    };
    const token = await clientStorage.get(ClientStorageKey.STOKEN);
    const offlineSessionId = await clientStorage.get(
      ClientStorageKey.OFFLINE_SESSION_ID
    );
    if (token) {
      seed.token = token;
      seed.dataMode = UserDataMode.CLOUD;
      seed.sessionType = UserSessionType.RETURNING;
    } else if (offlineSessionId) {
      seed.dataMode = UserDataMode.LOCAL;
      seed.sessionType = UserSessionType.RETURNING;
    }
    const userInfo = await clientStorage.get(ClientStorageKey.USER_INFO);
    if (userInfo) {
      seed.userInfo = JSON.parse(userInfo ?? "");
      seed.userId = seed.userInfo?.id.split("user:")[1];
    }
    this.set(seed);
    this.postToEmbed(seed);
  }

  async postToEmbed(data: any = null) {
    if (!data) {
      const token = await clientStorage.get(ClientStorageKey.STOKEN);
      const userInfo = JSON.parse(
        await clientStorage.get(ClientStorageKey.USER_INFO) ?? ""
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

  async expire() {
    logger.log({ at: "account.store - Expiring account" });
    await clientStorage.remove(ClientStorageKey.STOKEN);
    this.update(() => {
      const n = {
        sessionType: UserSessionType.UNDETERMINED,
        dataMode: UserDataMode.NONE
      };
      return n;
    }); 
    await flux.terminate();
  } 

  signIn(
    data: {
      userInfo: UserInformation;
      token: string;
      refreshToken?: string;
    },
    params: {
      isNewUser?: boolean;
    } = { isNewUser: false }
  ) {
    console.log("signing in", { data });
    clientStorage.set(ClientStorageKey.STOKEN, data.token);
    clientStorage.set(
      ClientStorageKey.USER_INFO,
      JSON.stringify(data.userInfo)
    );
    localStorage.setItem("refresh-token", data.refreshToken ?? "");
    this.postToEmbed(data);
    const isBootstrapped = data.userInfo.isBootstrapped;
    this.update(() => {
      return {
        token: data.token,
        dataMode: UserDataMode.CLOUD,
        userId: data.userInfo.id.split("user:")[1],
        userInfo: data.userInfo,
        sessionType:
          isBootstrapped && !params.isNewUser
            ? UserSessionType.RETURNING
            : UserSessionType.NEW
      };
    });
    if (params.isNewUser && isBootstrapped) {
      appStore.gotoPath("/onboarding");
    } else if (!isBootstrapped) {
      appStore.gotoPath("/bootstrap");
    } else {
      appStore.gotoPath("/");
    }
  }

  async signOut() {
    await this.expire();
    signout("signOut account.store");
    await this.clearAllCache();
  }
  async embedOAuthSignin(token: string) {
    clientStorage.set(ClientStorageKey.STOKEN, token);
    let response = await this.persistence.getUserInfo(token);
    if (response?.userInfo) {
      this.signIn({
        userInfo: response?.userInfo,
        token: token,
        refreshToken: token
      });
    } else {
      console.log("error", response);
    }
  }

  async delete() {
    confirmationNotification.notify({
      title: "Account deletion confirmation",
      message: "Are you sure you want to delete your account?",
      confirmAction: {
        label: "Delete",
        variant: ButtonVariant.DANGER,
        callback: async () => {
          return this.confirmDelete();
        }
      }
    });
  }

  async confirmDelete() {
    let acc = this.get();
    await performApiCall("account/n/deleteAccount", "POST", {});
    console.log("deleting account", { acc });
    await this.signOut();
    appStore.gotoPath("/signup?msg=deleted");
    return true;
  }

  ping() {
    this.postToEmbed();
    return this.persistence.ping();
  }
  async logGuest(id: string) {
    try {
      return this.persistence.runAccountAction("guest", { id });
    } catch (e) {
      logger.error({ at: "logGuest", error: e });
    }
  }

  async startOfflineSession() {
    this.update((n) => {
      n.dataMode = UserDataMode.LOCAL;
      return n;
    });
    clientStorage.set(
      ClientStorageKey.OFFLINE_SESSION_ID,
      generateSimpleRandomId()
    );
  }

  async bootstrap(region: string) {
    await this.bootstrapRemote(region);
    clientStorage.set(ClientStorageKey.LAST_SYNCED_AT, new Date().getTime());
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
        isNewUser: true
      }
    );
    this.setAnalyticsUserIdentity();
    return true;
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

  async uploadFileV2(
    contentType: string,
    fileName: string,
    blob: any,
    isTemp: boolean = false
  ) {
    try {
      const account = this.get();
      const id = contentType.split("/")[0] + "_" + generateSimpleRandomId();
      logger.debug({ at: "uploadFileV2", id, contentType, fileName });
      if (account.dataMode === UserDataMode.LOCAL) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const response = await fileStore.create([
          {
            id,
            label: fileName,
            type: contentType,
            data: uint8Array
          }
        ]);
        return response;
      } else {
        const signedUrlResponse = await this.getSignedUrl(
          contentType,
          fileName,
          isTemp
        );
        if (!signedUrlResponse || !signedUrlResponse.uploadURL) return null;

        await this.persistence.uploadFile(
          signedUrlResponse.uploadURL,
          contentType,
          blob
        );
        const url = signedUrlResponse.uploadURL.split("?")[0];
        const response = await fileStore.create([
          {
            id,
            label: fileName,
            type: contentType,
            url
          }
        ]);
        return response;
      }
    } catch (e) {
      logger.error({ at: "uploadFileV2", error: e });
    }
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
    const token = await clientStorage.get(ClientStorageKey.STOKEN);
    const offlineSessionId = await clientStorage.get(
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
  async clearAllCache() {
    const env = await clientStorage.get(ClientStorageKey.ENV);
    const appData = await clientStorage.get(ClientStorageKey.APP_DATA);
    const product = await clientStorage.get(ClientStorageKey.PRODUCT);
    const dapId = await clientStorage.get(ClientStorageKey.DAP_ID);
    await clientStorage.clearAll();
    get(dataManager)?.cacheSource?.clearCache();
    if (env) await clientStorage.set(ClientStorageKey.ENV, env);
    if (product) await clientStorage.set(ClientStorageKey.PRODUCT, product);
    if (appData) await clientStorage.set(ClientStorageKey.APP_DATA, appData);
    if (dapId) await clientStorage.set(ClientStorageKey.DAP_ID, dapId);
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
