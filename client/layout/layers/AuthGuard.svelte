<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/stores";
  import { ClientStorageKey } from "@21n/persistence/persistence.type";
  import { clientStorage } from "@21n/persistence/persistence.utils";
  import account from "@21n/stores/account.store";
  import { appStore } from "@21n/stores/app.store";
  import context from "@21n/stores/context.store";
  import { UserDataMode, UserSessionType } from "@21n/types/account.type";
  import { postTokenToExtension } from "@21n/utils/embed.utils";
  import { onMount } from "svelte";
  import {
    resolveAuthSession,
    shouldUseAuthFnBearerSession
  } from "@21n/components/account/auth";
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
    if (result) {
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
    const resolution = await resolveAuthSession();
    if (
      resolution.status === "offline-only" ||
      resolution.status === "cached-cloud"
    ) {
      return true;
    }

    if (resolution.status === "expired") {
      logger.warn({
        at: "AuthGuard.performLoginStatusCheck.session.expired",
        currentPath: window.location.pathname
      });
      clearAccountStore();
      appStore.gotoPath("/account/login", {
        queryParams: { msg: "expired" },
        replaceState: true
      });
      return false;
    }

    if (resolution.status === "unavailable") {
      logger.warn({
        at: "AuthGuard.performLoginStatusCheck.session.unavailable",
        error: resolution.error,
        currentPath: window.location.pathname
      });
      appStore.gotoPath("/account/login", {
        queryParams: { msg: "unavailable" },
        replaceState: true
      });
      return false;
    }

    if (resolution.status === "signed-out") {
      clearAccountStore();
      appStore.gotoPath("/account/login", { replaceState: true });
      return false;
    }

    const authSession = resolution.session;
    const subject = authSession.subject ?? {};
    const actorId = String(authSession.actorId ?? "");
    const normalizedActorId = actorId.startsWith("user:")
      ? actorId
      : `user:${actorId}`;
    const unprefixedActorId = normalizedActorId.slice("user:".length);
    const currentUserInfo = account.get()?.userInfo;
    const userInfo = {
      id: normalizedActorId,
      email: authSession.primaryEmail ?? subject.email ?? "",
      isBootstrapped:
        (
          authSession.metadata?.nucleus as
            | { isBootstrapped?: boolean }
            | undefined
        )?.isBootstrapped ?? false,
      nickName:
        currentUserInfo?.nickName ??
        authSession.primaryEmail?.split("@")[0] ??
        subject.email?.split("@")[0] ??
        "App user",
      joinDate: currentUserInfo?.joinDate ?? new Date(),
      lastLogin: new Date(),
      region: authSession.regionId ?? subject.regionId
    };
    await clientStorage.set(ClientStorageKey.USER, authSession);
    await clientStorage.set(ClientStorageKey.USER_INFO, userInfo);
    logger.info({
      at: "AuthGuard.performLoginStatusCheck.session.ok",
      hasAuthFnToken: Boolean(resolution.storedState.authFnToken),
      hasOfflineSession: Boolean(resolution.storedState.offlineSessionId),
      sessionId: authSession.id,
      regionId: authSession.regionId ?? subject.regionId,
      currentPath: window.location.pathname
    });
    account.update((current) => ({
      ...current,
      token: resolution.storedState.authFnToken,
      dataMode: UserDataMode.CLOUD,
      sessionType: UserSessionType.RETURNING,
      userId: unprefixedActorId,
      userInfo: userInfo as any
    }));
    return true;
  }

  function clearAccountStore() {
    account.update(() => ({
      dataMode: UserDataMode.NONE,
      sessionType: UserSessionType.UNDETERMINED
    }));
  }
</script>

{@render children?.(isLoggedIn)}
