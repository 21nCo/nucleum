import { get, writable } from "svelte/store";
import type { UserAccount, UserInformation } from "../types/account.type";
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
import { logger } from "./log.store";
import { ObservableStore } from "./client.store";
import {
  StoreDataType,
  type IObservableStoreSubject
} from "$lib/client/types/data.type";
import { generateUID } from "../utils/utils";

export const isRefreshingToken = writable(false);

class AccountStore extends ObservableStore<
  UserAccount & IObservableStoreSubject
> {
  persistence = new Persistence();
  constructor() {
    super("account", StoreDataType.NA);
    let seed: UserAccount = {
      isLoggedIn: false,
      token: null
    };
    if (localStorage.getItem("stoken")) {
      seed.token = localStorage.getItem("stoken");
      seed.isLoggedIn = true;
    }
    if (localStorage.getItem("userInfo")) {
      seed.userInfo = JSON.parse(localStorage.getItem("userInfo") ?? "");
    }
    this.set(seed);
    postToParent({
      account: JSON.stringify({
        userId: seed.userInfo?.id.split("user:")[1],
        token: seed.token,
        isLoggedIn: true
      })
    });
  }

  expire() {
    logger.log({ context: "account.store - Expiring account" });
    localStorage.removeItem("stoken");
    this.update(() => {
      const n = { token: null, isLoggedIn: false };
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
    } = { isIgnoreRefresh: false }
  ) {
    console.log("signing in", { data });
    localStorage.setItem("stoken", data.token);
    localStorage.setItem("refresh-token", data.refreshToken ?? "");
    localStorage.setItem("userInfo", JSON.stringify(data.userInfo));
    postToParent({
      account: JSON.stringify({
        userId: data.userInfo.id.split("user:")[1],
        token: data.token,
        refreshToken: data.refreshToken,
        isLoggedIn: true
      })
    });
    this.update(() => {
      return {
        token: data.token,
        isLoggedIn: true,
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
      appStore.gotoPath("/");
    }
  }

  signOut() {
    this.expire();
    signout("signOut account.store");
  }
  async embedOAuthSignin(token: string) {
    localStorage.setItem("stoken", token);
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
    return this.persistence.ping();
  }
  logGuest() {
    let id = localStorage.getItem("guest");
    if (!id) {
      id = generateUID();
      localStorage.setItem("guest", id);
    }
    return this.persistence.runAccountAction("guest", { id });
  }
  bootstrap(region: string) {
    const id = this.get()?.userInfo?.id?.split("user:")[1];
    if (!id) return;
    return this.persistence.runAccountAction("bootstrap", {
      id,
      region
    });
  }
  async performLoginStatusCheck() {
    const token = localStorage.getItem("stoken");
    if (!token) {
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

  async checkIfSessionExpired() {
    const token = localStorage.getItem("stoken");
    if (!token) {
      this.expire();
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
}

const account = new AccountStore();
export default account;
