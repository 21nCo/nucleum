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

export const isRefreshingToken = writable(false);

const account = initAccount({
  isLoggedIn: false,
  token: null
});

function initAccount(seed: UserAccount) {
  if (localStorage.getItem("surreal-token")) {
    seed.token = localStorage.getItem("surreal-token");
    seed.isLoggedIn = true;
  }
  if (localStorage.getItem("userInfo")) {
    seed.userInfo = JSON.parse(localStorage.getItem("userInfo") ?? "");
  }
  postToParent({
    account: JSON.stringify({
      userId: seed.userInfo?.id.split("user:")[1],
      token: seed.token,
      isLoggedIn: true
    })
  });
  const { subscribe, set, update } = writable<UserAccount>(seed);
  const checkIfSessionExpired = async () => {
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
      const response = await new Persistence().refreshToken();
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
  };
  const addSeedUserInfo = (n: UserAccount) => {
    let seedUserInfo = {
      email: "john.legend@gmail.com",
      phone: "",
      nickName: "",
      joinDate: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 200),
      lastLogin: new Date(),
      profilePicture: "",
      id: ""
    };
    n.userInfo = seedUserInfo;
    return n;
  };
  const signin = async (
    data: {
      userInfo: UserInformation;
      token: string;
      refreshToken?: string;
    },
    params: {
      isIgnoreRefresh?: boolean;
      isFromSignup?: boolean;
    } = { isIgnoreRefresh: false, isFromSignup: false }
  ) => {
    console.log("signing in", { data });
    localStorage.setItem("surreal-token", data.token);
    localStorage.setItem("refresh-token", data.refreshToken ?? "");
    localStorage.setItem("userInfo", JSON.stringify(data.userInfo));
    // isOnboardingComplete.check();
    postToParent({
      account: JSON.stringify({
        userId: data.userInfo.id.split("user:")[1],
        token: data.token,
        refreshToken: data.refreshToken,
        isLoggedIn: true
      })
    });
    update(() => {
      return {
        token: data.token,
        isLoggedIn: true,
        userId: data.userInfo.id,
        userInfo: data.userInfo
      };
    });
    if (!params.isIgnoreRefresh && !params.isFromSignup) {
      appEvents.publish(GlobalEvent.USER_LOGIN, true);
      appStore.gotoPath("/");
    } else if (params.isFromSignup) {
      appEvents.publish(GlobalEvent.USER_SIGNUP, true);
      appStore.gotoPath("/onboarding");
    } else if (!params.isFromSignup) {
      appStore.gotoPath("/");
    }
  };
  const expire = () => {
    localStorage.removeItem("surreal-token");
    update(() => {
      const n = { token: null, isLoggedIn: false };
      return n;
    });
    appEvents.publish(GlobalEvent.USER_LOGIN, false);
  };
  const performLoginStatusCheck = async () => {
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
  };
  const getSignedUrl = (
    contentType: string,
    fileName: string,
    isTemp: boolean
  ) => {
    const acc = get(account);
    const userId = acc.userInfo?.id.split(":")[1] ?? "";
    return new Persistence().getSignedUrl(
      userId,
      contentType,
      fileName,
      isTemp
    );
  };
  return {
    subscribe,
    set,
    signOut: () => {
      expire();
      signout();
    },
    signIn: signin,
    expire,
    embedOAuthSignin: async (token: string, isSignup: boolean) => {
      localStorage.setItem("surreal-token", token);
      let response = await new Persistence().getUserInfo(token);
      if (response?.userInfo) {
        await signin(
          {
            userInfo: response?.userInfo,
            token: token,
            refreshToken: token
          },
          { isFromSignup: isSignup }
        );
      } else {
        console.log("error", response);
      }
    },
    delete: () => {
      //todo - delete account
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
    },
    confirmDelete: async () => {
      let acc = get(account);
      await performApiCall("account/n/deleteAccount", "POST", {
        id: acc.userId
      });
      console.log("deleting account", { acc });
      account.signOut();
      appStore.gotoPath("/signup?msg=deleted");
      return true;
    },
    performLoginStatusCheck,
    performRedirectionCheck: performLoginStatusCheck,
    ping: async () => {
      return new Persistence().ping();
    },
    getSignedUrl,
    uploadFile: async (
      contentType: string,
      fileName: string,
      blob: any,
      isTemp: boolean = false
    ) => {
      const signedUrlResponse = await getSignedUrl(
        contentType,
        fileName,
        isTemp
      );
      if (signedUrlResponse?.uploadURL) {
        await new Persistence().uploadFile(
          signedUrlResponse.uploadURL,
          contentType,
          blob
        );
        return signedUrlResponse;
      } else return null;
    }
  };
}

export default account;
