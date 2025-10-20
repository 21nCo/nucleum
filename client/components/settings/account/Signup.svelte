<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import AccountForm from "@21n/components/settings/account/signup/AccountForm.svelte";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "@21n/types/switcher.enum";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import SubAtomLogo from "@21n/branding/SubAtomLogo.svelte";
  import { properCase } from "@21n/shared-utils/text.utils";
  import { ClientStorageKey } from "@21n/persistence/persistence.type";
  import { clientStorage } from "@21n/persistence/persistence.utils";
  import { isTokenExpired } from "@21n/utils/account.utils";
  import PoliciesFooter from "@21n/elements/PoliciesFooter.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import account from "@21n/stores/account.store";
  import { toasts } from "@21n/stores/notification.store";
  import AppLoadingView from "@21n/layout/paint/AppLoadingView.svelte";
  import { parse } from "@21n/shared-utils/json.utils";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import view from "@21n/stores/view.store";
  let isSignup = true;
  let message: string | undefined = undefined;
  let currentProgress: string | undefined = undefined;
  let isSigningIn = false;
  let isLoginFromExtension = false;
  const managedSyncHosts = [
    "localhost",
    "21n.dev",
    "memotron.app",
    "pointron.app",
    "nucleus.to"
  ];
  let isSelfHosted =
    typeof window !== "undefined" ? resolveIfSelfHostedInstance() : false;
  let messageParam = $page.url.searchParams.get(AppSearchParam.MSG);
  $: productName = properCase($appStore.product);
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
    if (isLoginFromExtensionParam && isLoginFromExtensionParam === "true") {
      isLoginFromExtension = true;
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

  function resolveIfSelfHostedInstance() {
    const host = window.location.hostname;
    return !managedSyncHosts.some((h) => host === h || host.endsWith(`.${h}`));
  }

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
  <div class="flex flex-col w-full h-full justify-center cw:pt-8">
    <div
      class="w-full h-full grid grid-cols-2 portrait:grid-cols-1 portrait:justify-start justify-center items-center gap-12 portrait:gap-6"
    >
      <!-- <div class="flex flex-col items-center">
      <SubAtomLogo subatom="pointron" isDark={true} />
      <div class="font-medium text-h3 text-fgs2">
        {$appStore.appData.name}
      </div>
    </div> -->

      <div class="flex flex-col justify-center gap-6 h-full">
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
          <div
            class="w-full flex flex-col justify-center items-center cw:h-fit h-40"
          >
            <SubAtomLogo subatom={$appStore.product} />
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
      <div
        class="w-full grid portrait:grid-rows-[1fr,auto] grid-rows-[auto,1fr,auto] portrait:bg-bgs1 bg-bgs2 h-full"
      >
        {#if !$view.isPortrait}
          {#if isLoginFromExtension}
            <div
              class="flex flex-col gap-2 justify-center items-center w-full cw:pt-6 pt-12"
            >
              <div class="text-h4 text-center w-full">
                Thanks for installing {productName} extension.
              </div>
              <div class="text-fgs3 text-b2 text-center">
                Click continue to login to your account.
              </div>
            </div>
          {:else}
            <div class="flex flex-col items-center gap-1 cw:pt-6 pt-12">
              <h3 class="text-h3 text-center font-medium">
                Welcome to {productName}
              </h3>
              <div class="text-fgs3 text-b2 text-center">
                {isSelfHosted ? "[Self-hosted instance]" : "Sign up or Log in"}
              </div>
            </div>
          {/if}
        {/if}
        {#if $appStore.appData.auth?.isInviteOnly}
          <div class="font-medium px-4 text-center text-ass1 text-b2 -mb-4">
            This product is invite only. Please use the invite link to sign up.
          </div>
        {:else}
          <div class="flex w-full justify-center items-center">
            <AccountForm
              {isSignup}
              bind:currentProgress
              {isLoginFromExtension}
              {isSelfHosted}
            />
          </div>
        {/if}
        {#if isSignup}
          <div class="flex flex-col items-center gap-6 pb-12">
            {#if !isSelfHosted}
              <PoliciesFooter pretext="By signing up, you agree to our" />
            {/if}
            <div class="flex items-center gap-12">
              {#if isSelfHosted}
                <Button
                  label="Github"
                  style={ButtonStyle.PLAIN}
                  icon="weblink-two"
                  size={Size.sm}
                  on:click={() => {
                    if ($appStore.appData?.urls?.git)
                      appStore.openLink($appStore.appData?.urls?.git);
                  }}
                />
              {/if}
              <Button
                label="Pricing"
                style={ButtonStyle.PLAIN}
                icon="weblink-two"
                size={Size.sm}
                on:click={() => {
                  if ($appStore.appData?.urls?.pricing)
                    appStore.openLink($appStore.appData?.urls?.pricing);
                  else if ($appStore.appData?.urls?.landing)
                    appStore.openLink(
                      `https://${$appStore.appData?.urls?.landing}/pricing`
                    );
                }}
              />
              <Button
                label="Docs"
                icon="weblink-two"
                style={ButtonStyle.PLAIN}
                size={Size.sm}
                on:click={() => {
                  if ($appStore.appData?.urls?.docs)
                    appStore.openLink($appStore.appData?.urls?.docs);
                }}
              />
              <Button
                label="Discord"
                icon="weblink-two"
                style={ButtonStyle.PLAIN}
                size={Size.sm}
                on:click={() => {
                  if ($appStore.appData?.urls?.discord)
                    appStore.openLink($appStore.appData?.urls?.discord);
                }}
              />
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<svelte:window on:message={handleMessageFromParent} />
