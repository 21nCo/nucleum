<svelte:options runes={true} />

<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import type { Snippet } from "svelte";
  import { page } from "$app/stores";
  import { resolveAuthSession } from "@nucleum/client/runtime/account/auth";
  import AppLoadingView from "@nucleum/composition/AppLoadingView.svelte";
  import Button from "@21n/ui/elements/button/Button.svelte";

  import productData from "$local/local";
  import AuthGuard from "@nucleum/composition/layers/AuthGuard.svelte";
  import { postMessageToParent } from "@nucleum/client/runtime/embed/embed.utils";
  import { EmbedMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";
  import { onMount } from "svelte";
  import AccountDebugInfo from "./AccountDebugInfo.svelte";
  let { children: pageChildren }: { children?: Snippet } = $props();
  let isEmbedTokenPresent = $state(false);
  const dev_isDebugAccountMode = false;
  onMount(() => {
    postMessageToParent(EmbedMessage.MOUNT);
    const token = localStorage.getItem("embedToken");
    isEmbedTokenPresent = token ? true : false;
  });

  type RouteAuthState =
    "authenticated" | "expired" | "signed-out" | "unavailable";

  const authPath = $derived($page.url.pathname);
  const hasAuthToken = $derived($page.url.searchParams.has("token"));
  const routeAuthCheck = $derived({ path: authPath, hasToken: hasAuthToken });
  let routeAuthState = $state<RouteAuthState | "error" | undefined>();
  let knownAuthIdentity: string | undefined;
  let authGuardEpoch = $state(0);

  $effect(() => {
    const { hasToken } = routeAuthCheck;
    let isCurrent = true;
    resolveRouteAuthState(hasToken).then(
      (resolved) => {
        if (!isCurrent) return;
        adoptAuthIdentity(resolved.identity);
        routeAuthState = resolved.state;
      },
      () => {
        if (isCurrent) routeAuthState = "error";
      }
    );
    return () => {
      isCurrent = false;
    };
  });

  /**
   * Remounts AuthGuard only when a check resolves a known identity that
   * differs from the previously known one, such as after signing in to another
   * account in a different tab. The first known identity is adopted without a
   * remount, and checks that cannot tell the identity (cached cloud sessions,
   * embed token landings) never change it.
   */
  function adoptAuthIdentity(identity: string | undefined) {
    if (!identity) return;
    if (knownAuthIdentity && knownAuthIdentity !== identity) {
      authGuardEpoch += 1;
    }
    knownAuthIdentity = identity;
  }

  /**
   * Resolves the route auth state and, when the session reveals it, the
   * identity of the signed-in account.
   */
  async function resolveRouteAuthState(
    hasToken: boolean
  ): Promise<{ state: RouteAuthState; identity?: string }> {
    if (hasToken) return { state: "authenticated" };
    const resolution = await resolveAuthSession();
    if (resolution.status === "authenticated") {
      return {
        state: "authenticated",
        identity: `cloud:${resolution.session.actorId}`
      };
    }
    if (resolution.status === "offline-only") {
      return {
        state: "authenticated",
        identity: resolution.storedState.offlineSessionId
          ? `offline:${resolution.storedState.offlineSessionId}`
          : undefined
      };
    }
    if (resolution.status === "cached-cloud") {
      return { state: "authenticated" };
    }
    if (resolution.status === "expired") return { state: "expired" };
    if (resolution.status === "unavailable") return { state: "unavailable" };
    return { state: "signed-out" };
  }

  function goToAuthRoute(authState: RouteAuthState) {
    if (authState === "unavailable") {
      window.location.reload();
      return;
    }
    navigation.gotoPath("/account/login", {
      queryParams: authState === "expired" ? { msg: "expired" } : undefined
    });
  }
</script>

{#if routeAuthState === undefined}
  <AppLoadingView />
{:else if routeAuthState === "error"}
  <div class="h-full flex flex-col justify-center items-center">
    <div class="text-ass1 text-b2 mb-4">Authentication error</div>
    <Button
      label="Login/Signup"
      onclick={() => {
        navigation.gotoPath("/account/login");
      }}
    />
  </div>
{:else}
  {@const authState = routeAuthState}
  {#if authState === "authenticated"}
    {#if dev_isDebugAccountMode}
      <AccountDebugInfo />
    {:else}
      {#key authGuardEpoch}
        <AuthGuard>
          {#snippet children(isLoggedIn)}
            {#if isLoggedIn}
              {@const ProductBase = productData.base}
              <ProductBase>
                {@render pageChildren?.()}
              </ProductBase>
            {/if}
          {/snippet}
        </AuthGuard>
      {/key}
    {/if}
  {:else}
    <div class="h-full flex flex-col justify-center items-center">
      {#if authState === "expired"}
        <div class="text-ass1 text-b2 mb-4">
          Your session has expired. Please login again.
        </div>
      {:else if authState === "unavailable"}
        <div class="text-ass1 text-b2 mb-4">
          Account service is unavailable. Please try again once it is running.
        </div>
      {/if}
      <div>Embed token: {isEmbedTokenPresent}</div>
      <Button
        label={authState === "unavailable" ? "Retry" : "Login/Signup"}
        onclick={() => {
          goToAuthRoute(authState);
        }}
      />
    </div>
  {/if}
{/if}
