import { get, writable } from "svelte/store";
import {
  UserDataMode,
  UserSessionType,
  type UserAccount,
  type UserInformation
} from "../types/account.type";
import { postToParent } from "$lib/client/utils/embed.utils";
import { Persistence } from "../persistence/persistence";
import { ButtonVariant } from "../types/button.type";
import {
  determineIfOffline,
  performApiCall
} from "$lib/client/utils/network.utils";
import {
  confirmationNotification,
  toasts
} from "$lib/client/stores/notification.store";
import { appStore } from "./app.store";
import jwt_decode from "jwt-decode";
import { getBucketNameandKey, signout } from "../utils/account.utils";
import { ObservableStore } from "./client.store";
import {
  StoreDataType,
  type IObservableStoreSubject
} from "$lib/client/types/data.type";
import { clientStorage } from "../persistence/persistence.utils";
import { ClientStorageKey } from "../persistence/persistence.type";
import { logger } from "../components/debug/logger.client";
import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
import { fileStore } from "../components/files/file.store";
import { flux } from "../components/flux/flux";
import { generateResourceId } from "../components/flux/flux.utils";
import { Resource } from "../components/flux/resourceStores/resource.enum";
import { dispatchCustomEvent } from "../utils/browser.utils";
import { GlobalEvent } from "../types/event.enum";
import context from "./context.store";

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
        (await clientStorage.get(ClientStorageKey.USER_INFO)) ?? ""
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
    // localStorage.setItem("refresh-token", data.refreshToken ?? "");
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

  async signOut(params?: {
    isPreventDapIdClear?: boolean;
    isPreventRedirect?: boolean;
  }) {
    this.update(() => {
      const n = {
        sessionType: UserSessionType.UNDETERMINED,
        dataMode: UserDataMode.NONE
      };
      return n;
    });
    await flux?.terminate();
    await signout(params, "signOut account.store");
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
    let isDeleted = false;
    try {
      dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        message: `Deleting account...`
      });
      const result = await performApiCall(
        "account/n/deleteAccount",
        "POST",
        {}
      );
      if (!result?.ok) {
        toasts.error("Failed to delete account. Please try again later.");
        return false;
      }
      const data = await result.json();
      if (data?.error) {
        toasts.error(data.error);
        return false;
      }
      await this.signOut({ isPreventRedirect: true });
      await flux.clear();
      appStore.gotoPath("/signup?msg=deleted");
      isDeleted = true;
      return true;
    } catch (e) {
      logger.error({ at: "confirmDelete", error: e });
      toasts.error("Failed to delete account. Please try again later.");
      return false;
    } finally {
      dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        message: isDeleted ? `Account deleted.` : "Account deletion failed.",
        subMessage: "",
        isFinished: true
      });
    }
  }

  async ping() {
    this.postToEmbed();
    const isOffline = await determineIfOffline();
    if (isOffline) return;
    const response = await this.persistence.ping();
    const user = response?.[0]?.result?.[0];
    if (!response) {
      appStore.gotoErrorPage("Something went wrong.");
    }
    if (response && !user) {
      await this.signOut({ isPreventRedirect: true });
      await flux.clear();
      appStore.gotoPath("/signup?msg=notfound");
    }
    return response;
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
    return this.bootstrapRemote(region);
  }

  async bootstrapRemote(region: string) {
    const id = this.get()?.userInfo?.id?.split("user:")[1];
    if (!id) return;
    const response = await this.persistence.runAccountAction("bootstrap", {
      id,
      region
    });
    if (!response || response.error || !response.userInfo) {
      return false;
    }
    this.signIn(
      {
        userInfo: response.userInfo,
        token: response.token
      },
      {
        isNewUser: true
      }
    );
    return true;
  }

  getSignedUrl(contentType: string, fileName: string, isTemp: boolean) {
    const acc = get(account);
    const userId = acc.userInfo?.id.split(":")[1] ?? "";
    return this.persistence.getSignedUrl(userId, contentType, fileName, isTemp);
  }

  /**
   * @deprecated - use uploadFileV2 instead
   * @param contentType
   * @param fileName
   * @param blob
   * @param isTemp
   * @returns
   */
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
    params: {
      isTemp?: boolean;
      isReturnUrl?: boolean;
      isExtensionEnv?: boolean;
      isPreventSync?: boolean;
      isMeta?: boolean;
    } = {}
  ) {
    try {
      const account = this.get();
      const id = generateResourceId(Resource.file, {
        id: contentType.split("/")[0] + "_" + generateSimpleRandomId()
      });
      logger.log({ at: "uploadFileV2", id, contentType, fileName });
      fileName = fileName.replace(/\s+/g, "_").replace(/[\(\)@]/g, "");
      if (account.dataMode === UserDataMode.LOCAL || params.isPreventSync) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const response = await fileStore.create([
          {
            id,
            label: fileName,
            type: contentType,
            data: uint8Array,
            size: uint8Array.length,
            isMeta: params.isMeta
          }
        ]);
        return response;
      } else {
        const signedUrlResponse = await this.getSignedUrl(
          contentType,
          fileName,
          params.isTemp ?? false
        );
        if (!signedUrlResponse || !signedUrlResponse.uploadURL) return null;

        await this.persistence.uploadFile(
          signedUrlResponse.uploadURL,
          contentType,
          blob
        );
        // const url = signedUrlResponse.uploadURL.split("?")[0];
        const key = getBucketNameandKey(signedUrlResponse.uploadURL);
        const signedGetUrl = await this.persistence.fetchSignedUrlForGet(key);
        const url = signedGetUrl?.getUrl;
        const file = {
          id,
          label: fileName,
          type: contentType,
          url,
          size: blob.size,
          isMeta: params.isMeta
        };
        if (params.isReturnUrl) {
          return url;
        } else if (params.isExtensionEnv) {
          return file;
        }
        const response = await fileStore.create([file]);
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
    clientStorage.remove(ClientStorageKey.STOKEN);
    const refreshToken = localStorage.getItem("refresh-token");
    if (!refreshToken) {
      return true;
    }
    let decodedRefreshToken: any = jwt_decode(refreshToken);
    let refreshExp = decodedRefreshToken?.exp ?? 0;
    if (currentTime > refreshExp) {
      return true;
    }
    if (!get(isRefreshingToken)) {
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

  async isCloudUserOffline() {
    const account = this.get();
    const ctx = get(context);
    if (account.dataMode === UserDataMode.CLOUD && ctx.isInOfflineMode)
      return true;
    return false;
  }
}

const account = new AccountStore();
export default account;
