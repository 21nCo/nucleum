<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/stores";
  import { PlanType } from "@21n/components/subscription/userPlan.type";
  import { ClientStorageKey } from "@21n/persistence/persistence.type";
  import { clientStorage } from "@21n/persistence/persistence.utils";
  import account from "@21n/stores/account.store";
  import { appStore } from "@21n/stores/app.store";
  import context from "@21n/stores/context.store";
  import {
    UserDataMode,
    UserSessionType
  } from "@21n/types/account.type";
  import { Product } from "@21n/products/product.type";
  import { postTokenToExtension } from "@21n/utils/embed.utils";
  import { onMount } from "svelte";
  import { authClient } from "@21n/components/account/auth";
  import { hasLegacyCloudSession } from "@21n/utils/account.utils";

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
        const token = await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN);
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
        if ($account.plan && $account.plan.plan !== PlanType.NUCLEUS) {
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
    const authFnToken = await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN);
    const offlineSessionId = await clientStorage.get(
      ClientStorageKey.OFFLINE_SESSION_ID
    );

    const session = await (await authClient()).getSession();
    if (!session.ok || !session.data.session) {
      if (offlineSessionId && !authFnToken) return true;
      console.log("AuthFn session not found. Redirecting to signup");
      appStore.gotoPath("/signup");
      return false;
    }

    const authSession = session.data.session;
    const legacyCloudSession = await hasLegacyCloudSession();
    if (!legacyCloudSession) {
      await account.ensureOfflineSession();
    }
    await clientStorage.set(ClientStorageKey.USER, authSession);
    account.update((current) => ({
      ...current,
      token: authFnToken,
      dataMode: legacyCloudSession ? UserDataMode.CLOUD : UserDataMode.LOCAL,
      sessionType: UserSessionType.RETURNING,
      userId: authSession.actorId,
      userInfo: {
        ...(current.userInfo ?? {}),
        id: authSession.actorId.startsWith("user:")
          ? authSession.actorId
          : `user:${authSession.actorId}`,
        email: authSession.primaryEmail ?? authSession.subject.email ?? "",
        isBootstrapped:
          (authSession.metadata?.nucleus as { isBootstrapped?: boolean } | undefined)
            ?.isBootstrapped ?? true,
        nickName:
          current.userInfo?.nickName ??
          authSession.primaryEmail?.split("@")[0] ??
          authSession.subject.email?.split("@")[0] ??
          "App user",
        joinDate: current.userInfo?.joinDate ?? new Date(),
        lastLogin: new Date(),
        region: authSession.regionId ?? authSession.subject.regionId
      } as any
    }));
    return true;
  }
</script>

{@render children?.(isLoggedIn)}
