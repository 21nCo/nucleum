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
  import {
    authClient,
    shouldUseAuthFnBearerSession
  } from "@21n/components/account/auth";
  import { hasLegacyCloudSession } from "@21n/utils/account.utils";
  import { logger } from "@21n/components/debug/logger.client";

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
        const token = shouldUseAuthFnBearerSession()
          ? await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN)
          : undefined;
        postTokenToExtension({ token, userInfo });
        // appStore.runAction(Action.EXTENSTION_LOGIN);
        appStore.gotoPath("/ext/login");
        return;
      }
      if (
        $account?.dataMode === UserDataMode.CLOUD &&
        $appStore.product === Product.NUCLEUM
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
    const authFnToken = shouldUseAuthFnBearerSession()
      ? await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN)
      : undefined;
    const offlineSessionId = await clientStorage.get(
      ClientStorageKey.OFFLINE_SESSION_ID
    );

    let session;
    try {
      session = await (await authClient()).getSession();
    } catch (error) {
      logger.error({ at: "AuthGuard.performLoginStatusCheck.getSession", error });
      return Boolean(offlineSessionId && !authFnToken);
    }
    if (!session.ok || !session.data.session) {
      if (offlineSessionId && !authFnToken) return true;
      logger.warn({
        at: "AuthGuard.performLoginStatusCheck.session.missing",
        hasAuthFnToken: Boolean(authFnToken),
        hasOfflineSession: Boolean(offlineSessionId),
        error: session.ok ? undefined : session.error,
        currentPath: window.location.pathname
      });
      appStore.gotoPath("/signup");
      return false;
    }

    const authSession = session.data.session;
    const subject = authSession.subject ?? {};
    const actorId = String(authSession.actorId ?? "");
    const normalizedActorId = actorId.startsWith("user:") ? actorId : `user:${actorId}`;
    const unprefixedActorId = normalizedActorId.slice("user:".length);
    const legacyCloudSession = await hasLegacyCloudSession();
    if (!legacyCloudSession) {
      await account.ensureOfflineSession();
    }
    await clientStorage.set(ClientStorageKey.USER, authSession);
    logger.info({
      at: "AuthGuard.performLoginStatusCheck.session.ok",
      hasAuthFnToken: Boolean(authFnToken),
      hasOfflineSession: Boolean(offlineSessionId),
      sessionId: authSession.id,
      regionId: authSession.regionId ?? subject.regionId,
      currentPath: window.location.pathname
    });
    account.update((current) => ({
      ...current,
      token: authFnToken,
      dataMode: legacyCloudSession ? UserDataMode.CLOUD : UserDataMode.LOCAL,
      sessionType: UserSessionType.RETURNING,
      userId: unprefixedActorId,
      userInfo: {
        ...(current.userInfo ?? {}),
        id: normalizedActorId,
        email: authSession.primaryEmail ?? subject.email ?? "",
        isBootstrapped:
          (authSession.metadata?.nucleus as { isBootstrapped?: boolean } | undefined)
            ?.isBootstrapped ?? false,
        nickName:
          current.userInfo?.nickName ??
          authSession.primaryEmail?.split("@")[0] ??
          subject.email?.split("@")[0] ??
          "App user",
        joinDate: current.userInfo?.joinDate ?? new Date(),
        lastLogin: new Date(),
        region: authSession.regionId ?? subject.regionId
      } as any
    }));
    return true;
  }
</script>

{@render children?.(isLoggedIn)}
