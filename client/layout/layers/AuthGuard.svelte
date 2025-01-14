<script lang="ts">
  import { page } from "$app/stores";
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import account, { isRefreshingToken } from "$lib/client/stores/account.store";
  import {
    appStore,
    excludedPathsForRedirectionCheck
  } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import {
    UserDataMode,
    UserSessionType
  } from "$lib/client/types/account.type";
  import { postTokenToExtension } from "$lib/client/utils/embed.utils";
  import { wait } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";

  let isLoggedIn: boolean = false;

  onMount(async () => {
    if (
      !$context.isSheet &&
      $context.isEmbed
      // && $context.protocol.includes(import.meta.env?.VITE_CUSTOM_PROTOCOL)
    ) {
      await parseEmbedToken();
    }
    const result = await performLoginStatusCheck();
    if (
      result &&
      $account?.dataMode === UserDataMode.CLOUD &&
      !$account?.userInfo?.isBootstrapped
    ) {
      $account.sessionType = UserSessionType.NEW;
      appStore.gotoPath("/bootstrap");
    } else if (result) {
      const isLoginFromExtension = await clientStorage.getForSession(
        ClientStorageKey.IS_EXTENSION_LOGIN
      );
      if (isLoginFromExtension) {
        clientStorage.removeForSession(ClientStorageKey.IS_EXTENSION_LOGIN);
        const userInfo = await clientStorage.get(ClientStorageKey.USER_INFO);
        const token = await clientStorage.get(ClientStorageKey.STOKEN);
        postTokenToExtension({ token, userInfo });
        // appStore.runAction(Action.EXTENSTION_LOGIN);
        appStore.gotoPath("/ext/login");
        return;
      }
    }
    isLoggedIn = result;
    console.log({ isLoggedIn });
  });

  async function parseEmbedToken() {
    const token = $page.url?.searchParams?.get("token");
    if (token) {
      await account.embedOAuthSignin(token);
    }
  }

  /**
   * TODO - all {@link excludedPathsForRedirectionCheck} should be defined in routes as dynamic route [...route] is guarded by AuthGuard
   */
  async function performLoginStatusCheck() {
    const token = await clientStorage.get(ClientStorageKey.STOKEN);
    const offlineSessionId = await clientStorage.get(
      ClientStorageKey.OFFLINE_SESSION_ID
    );
    if (!token && !offlineSessionId) {
      console.log("Token not found. Redirecting to signup");
      appStore.gotoPath("/signup");
      return false;
    }
    let isSessionExpiredOrRefreshing = await account.checkIfSessionExpired();
    // if (isSessionExpiredOrRefreshing && $isRefreshingToken) {
    //   while ($isRefreshingToken) {
    //     await wait(1000);
    //   }
    // }
    // isSessionExpiredOrRefreshing = await account.checkIfSessionExpired();
    if (isSessionExpiredOrRefreshing) {
      appStore.gotoPath("/signup?msg=expired");
      return false;
    } else return true;
  }
</script>

<slot {isLoggedIn} />
