<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/stores";
  import { PlanType } from "@21n/components/subscription/userPlan.type";
  import { ClientStorageKey } from "@21n/persistence/persistence.type";
  import { clientStorage } from "@21n/persistence/persistence.utils";
  import account, { isRefreshingToken } from "@21n/stores/account.store";
  import {
    appStore,
    excludedPathsForRedirectionCheck
  } from "@21n/stores/app.store";
  import context from "@21n/stores/context.store";
  import {
    UserDataMode,
    UserSessionType
  } from "@21n/types/account.type";
  import { Product } from "@21n/products/product.type";
  import { postTokenToExtension } from "@21n/utils/embed.utils";
  import { wait } from "@21n/utils/time.utils";
  import { onMount } from "svelte";

  let { children }: { children?: Snippet<[boolean]> } = $props();
  let isLoggedIn = $state(false);

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
      if (
        $account?.dataMode === UserDataMode.CLOUD &&
        $appStore.product === Product.NUCLEUS
      ) {
        await account.ping({ isLightMode: true });
        if ($account.plan?.plan !== PlanType.NUCLEUS) {
          appStore.gotoPath("/error/access-denied");
          return;
        }
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

{@render children?.(isLoggedIn)}
