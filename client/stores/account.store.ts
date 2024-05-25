import { get, writable } from "svelte/store";
import type { UserAccount, UserInformation } from "../types/account.type";
import { postToParent } from "$lib/client/utils/embed.utils";
import { AppEvent } from "../types/event.enum";
import { Persistance } from "./persistance";
import { ButtonVariant } from "../types/button.type";
import { performApiCall } from "$lib/client/utils/network.utils";
import {
  confirmationNotification,
  appEvents
} from "$lib/client/stores/notification.store";
import { appStore } from "./app.store";

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
      refreshToken: string;
    },
    params: {
      isIgnoreRefresh?: boolean;
      isFromSignup?: boolean;
    } = { isIgnoreRefresh: false, isFromSignup: false }
  ) => {
    console.log("signing in", { data });
    localStorage.setItem("surreal-token", data.token);
    localStorage.setItem("refresh-token", data.refreshToken);
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
      appEvents.publish(AppEvent.USER_LOGIN, true);
      appStore.gotoPath("/");
    } else if (params.isFromSignup) {
      appEvents.publish(AppEvent.USER_SIGNUP, true);
      appStore.gotoPath("/onboarding");
    } else if (!params.isFromSignup) {
      appStore.gotoPath("/");
    }
  };
  const expire = () => {
    localStorage.removeItem("surreal-token");
    // localStorage.removeItem("userInfo");
    update(() => {
      const n = { token: null, isLoggedIn: false };
      return n;
    });
    appEvents.publish(AppEvent.USER_LOGIN, false);
    postToParent({
      account: JSON.stringify({
        isLoggedIn: false
      })
    });
  };
  return {
    subscribe,
    set,
    signOut: () => {
      expire();
      localStorage.removeItem("surreal-token");
      localStorage.removeItem("userInfo");
      localStorage.removeItem("isOnboardingComplete");
      appStore.gotoPath("/signup?msg=signedout");
    },
    signIn: signin,
    expire,
    embedOAuthSignin: async (token: string, isSignup: boolean) => {
      localStorage.setItem("surreal-token", token);
      let response = await new Persistance().getUserInfo(token);
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
            account.confirmDelete();
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
    }
  };
}

export default account;
