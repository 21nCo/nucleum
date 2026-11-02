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
  import account from "@nucleum/client/runtime/account/account.store";
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
  let authGuardEpoch = $state(0);

  $effect(() => {
    const { hasToken } = routeAuthCheck;
    let isCurrent = true;
    resolveRouteAuthState(hasToken).then(
      (resolved) => {
        if (!isCurrent) return;
        if (isDifferentFromLoadedAccount(resolved.liveActorId)) {
          authGuardEpoch += 1;
        }
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
   * Reports whether a live cloud session belongs to a different account than
   * the one AuthGuard has loaded, such as after signing in to another account
   * in a different tab. AuthGuard only hydrates the account from a live cloud
   * session, so comparing against the loaded account (not a remembered
   * identity) retries hydration on a later check if a remount failed to load
   * the new account. Cached cloud, offline-only and token checks never remount.
   */
  function isDifferentFromLoadedAccount(liveActorId: string | undefined) {
    if (!liveActorId) return false;
    const loadedUserId = account.get()?.userId;
    if (!loadedUserId) return false;
    const normalize = (id: string) =>
      id.startsWith("user:") ? id.slice("user:".length) : id;
    return normalize(loadedUserId) !== normalize(liveActorId);
  }

  /**
   * Resolves the route auth state and, for a live cloud session, the actor id
   * of the signed-in account.
   */
  async function resolveRouteAuthState(
    hasToken: boolean
  ): Promise<{ state: RouteAuthState; liveActorId?: string }> {
    if (hasToken) return { state: "authenticated" };
    const resolution = await resolveAuthSession();
    if (resolution.status === "authenticated") {
      return {
        state: "authenticated",
        liveActorId: String(resolution.session.actorId ?? "") || undefined
      };
    }
    if (
      resolution.status === "offline-only" ||
      resolution.status === "cached-cloud"
    ) {
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
