<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import AccountForm from "./signup/AccountForm.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import Link from "$lib/client/elements/text/Link.svelte";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import view from "$lib/client/stores/view.store";
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { Action } from "$lib/client/types/action.enum";
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import { isTokenExpired } from "$lib/client/utils/account.utils";
  import PoliciesFooter from "$lib/client/elements/PoliciesFooter.svelte";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import account from "$lib/client/stores/account.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import AppLoadingView from "$lib/client/layout/paint/AppLoadingView.svelte";
  import { parse } from "$lib/shared/utils/json.utils";
  let isSignup = true;
  let message: string | undefined = undefined;
  let currentProgress: string | undefined = undefined;
  let isSigningIn = false;
  let messageParam = $page.url.searchParams.get(AppSearchParam.MSG);
  if (messageParam) {
    if (messageParam === "deleted") {
      message = "Your account has been deleted.";
    } else if (messageParam === "signedout") {
      message = "You have been signed out.";
    } else if (messageParam === "expired") {
      message = "Your session has expired. Please login again.";
    } else if (messageParam === "notfound") {
      message = "User not found. Please login again.";
    }
  }
  onMount(async () => {
    const isLoginFromExtensionParam = $page.url.searchParams.get(
      AppSearchParam.EXT
    );
    if (isLoginFromExtensionParam) {
      clientStorage.setForSession(ClientStorageKey.IS_EXTENSION_LOGIN, true);
    }
    const token = await clientStorage.get(ClientStorageKey.STOKEN);
    if (!token) return;
    const isExpired = isTokenExpired(token);
    if (isExpired) {
      clientStorage.remove(ClientStorageKey.STOKEN);
      return;
    }
    appStore.gotoPath("/");
  });

  async function handleMessageFromParent(event: MessageEvent) {
    try {
      if (event?.data?.type === "SWIFT_MESSAGE" && event?.data?.payload) {
        const parsed = parse(event.data.payload);
        console.log({
          at: "Signup - handleMessageFromParent - SWIFT_MESSAGE",
          parsed
        });
        if (parsed.oauth) {
          currentProgress = undefined;
          const { token } = parsed.oauth;
          if (!token) {
            toasts.error();
            return;
          }
          isSigningIn = true;
          await account.embedOAuthSignin(token);
          isSigningIn = false;
        }
      }
    } catch (e) {
      console.error({ at: "Signup - handleMessageFromParent", error: e });
    }
  }
</script>

{#if isSigningIn}
  <AppLoadingView message={"Signing you in..."} />
{:else}
  <div class="flex flex-col w-full h-full justify-center pt-8 dp:pt-12">
    <div
      class="w-full flex flex-col justify-start items-center {$view.scale > 0.6
        ? 'gap-16'
        : 'gap-12'}"
    >
      <!-- <div class="flex flex-col items-center">
      <SubAtomLogo subatom="pointron" isDark={true} />
      <div class="font-medium text-h3 text-fgs2">
        {$appStore.appData.name}
      </div>
    </div> -->

      <div class="flex flex-col gap-6">
        <!-- TODO - reenable email signin/signup upon completion of forgot password flow -->
        {#if $appStore.isDebugMode}
          <PanelSwitcher
            items={["Sign up", "Sign in"]}
            value="Sign up"
            style={PanelSwitcherStyle.BAR}
            on:switch={(e) => {
              if (e.detail === "Sign up") {
                isSignup = true;
              } else {
                isSignup = false;
              }
            }}
          />
        {:else}
          <div class="w-full flex flex-col justify-center items-center h-40">
            <SubAtomLogo />
            <div class="font-medium">
              {properCase($appStore.product)}
            </div>
          </div>
        {/if}
        {#if message}
          <div class="font-medium px-4 text-center text-ass1 text-b2 -mb-4">
            {message}
          </div>
        {/if}
      </div>
      {#if $appStore.appData.auth?.isInviteOnly}
        <div class="font-medium px-4 text-center text-ass1 text-b2 -mb-4">
          This product is invite only. Please use the invite link to sign up.
        </div>
      {:else}
        <AccountForm {isSignup} bind:currentProgress />
      {/if}

      {#if isSignup}
        <PoliciesFooter pretext="By signing up, you agree to our" />
      {/if}
    </div>
  </div>
{/if}

<svelte:window on:message={handleMessageFromParent} />
