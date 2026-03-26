<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import { onMount } from "svelte";
  import { properCase } from "@21n/shared-utils/text.utils";
  import PoliciesFooter from "@21n/elements/PoliciesFooter.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import view from "@21n/stores/view.store";
  import BoxSwitcher from "@21n/elements/switcher/BoxSwitcher.svelte";
  import CloudSyncLogin from "./CloudSyncLogin.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { Display } from "@21n/types/view.type";
  import { parse } from "@21n/shared-utils/json.utils";
  import { toasts } from "@21n/stores/notification.store";
  let selectedMode: "signup" | "signin" | "offline" = "signup";
  let currentProgress: string | undefined = undefined;
  let cloudSyncLoginRef: CloudSyncLogin | undefined = undefined;
  let isLoginFromExtension = false;
  const dev_isEnableCaptcha = false;
  const managedSyncHosts = [
    "localhost",
    "21n.dev",
    "memotron.app",
    "pointron.app",
    "nucleus.to"
  ];
  let isSelfHosted =
    typeof window !== "undefined" ? resolveIfSelfHostedInstance() : false;
  $: productName = properCase($appStore.product);
  $: isExpandOAuthButtons =
    !$view.isConstrainedWidth && $view.display === Display.TK;

  function resolveIfSelfHostedInstance() {
    const host = window.location.hostname;
    return !managedSyncHosts.some((h) => host === h || host.endsWith(`.${h}`));
  }

  function onTurnstileSuccess(token) {
    console.log("Turnstile success:", token);
  }
  function onTurnstileError(errorCode) {
    console.error("Turnstile error:", errorCode);
  }
  function onTurnstileExpired() {
    console.warn("Turnstile token expired");
  }

  onMount(() => {
    window.onTurnstileSuccess = onTurnstileSuccess;
    window.onTurnstileError = onTurnstileError;
    window.onTurnstileExpired = onTurnstileExpired;

    return () => {
      delete window.onTurnstileSuccess;
      delete window.onTurnstileError;
      delete window.onTurnstileExpired;
    };
  });

  async function handleMessageFromParent(event: MessageEvent) {
    try {
      const isOriginAllowed = window.location.origin === event.origin;
      if (!isOriginAllowed) {
        console.warn(
          "Rejected message from untrusted origin:",
          event.origin,
          "currentOrigin:",
          window.location.origin
        );
        return;
      }

      if (event?.data?.type === "SWIFT_MESSAGE" && event?.data?.payload) {
        const parsed = parse(event.data.payload);
        if (parsed.oauth) {
          currentProgress = undefined;
          let { token } = parsed.oauth;
          if (token) {
            if (token.endsWith("#")) {
              token = token.slice(0, -1);
            }
          }
          if (!token) {
            toasts.error("Authentication failed. Please try again.");
            return;
          }
          localStorage.setItem("embedToken", token);
          appStore.gotoPath("/");
        }
      }
    } catch (e) {
      console.error({ at: "Signup - handleMessageFromParent", error: e });
    }
  }

</script>

<div
  class="w-full grid portrait:grid-rows-[1fr,auto] grid-rows-[auto,1fr,auto] gap-12 h-full"
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
        <!-- <div class="text-fgs3 text-b2 text-center">
                {isSelfHosted ? "[Self-hosted instance]" : "Sign up or Log in"}
              </div> -->
      </div>
    {/if}
  {/if}
  {#if $appStore.appData.auth?.isInviteOnly}
    <div class="font-medium px-4 text-center text-ass1 text-b2 -mb-4">
      This product is invite only. Please use the invite link to sign up.
    </div>
  {:else}
    <div class="flex flex-col gap-6 w-full items-center justify-center">
      <div class="h-12">
        <BoxSwitcher
          bind:selected={selectedMode}
          options={[
            {
              value: "signup",
              label: "Sign up"
            },
            {
              value: "signin",
              label: "Log in"
            },
            {
              value: "offline",
              label: "Offline"
            }
          ]}
          on:select={() => {
            if (cloudSyncLoginRef) {
              cloudSyncLoginRef.reset();
            }
          }}
        />
      </div>
      <div
        class={cn(
          "cw:h-[30rem] flex flex-col gap-6 justify-center transition-all duration-300",
          {
            "h-[42rem]": isExpandOAuthButtons,
            "h-[32rem]": !isExpandOAuthButtons
          }
        )}
      >
        {#if selectedMode === "signup" || selectedMode === "signin"}
          <CloudSyncLogin
            isSignup={selectedMode === "signup"}
            {isExpandOAuthButtons}
            bind:this={cloudSyncLoginRef}
          />
        {:else}
          <Button
            label="Continue using offline"
            icon="proceed"
            on:click={() => {}}
          />
        {/if}
        <div
          class="text-fgs3 text-b3 opacity-80 group-hover:opacity-100 transition-opacity duration-300"
        >
          {#if selectedMode === "offline"}
            Single device use & free forever. No signup required.
          {:else if selectedMode === "signup"}
            Includes a 14-day free trial. No credit card required.
          {/if}
          {#if dev_isEnableCaptcha}
            <div class="my-2">
              <div
                class="cf-turnstile"
                data-sitekey="0x4AAAAAACATamWGPvJohc2V"
                data-theme="auto"
                data-size="flexible"
                data-callback="onTurnstileSuccess"
                data-error-callback="onTurnstileError"
                data-expired-callback="onTurnstileExpired"
              ></div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
  <div class="flex flex-col items-center gap-6 pb-12">
    {#if !isSelfHosted}
      <PoliciesFooter pretext="By signing up, you agree to our" />
    {/if}
    {#if $view.display === Display.TK}
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
    {/if}
  </div>
</div>

<svelte:head>
  <link rel="preconnect" href="https://challenges.cloudflare.com" />
  <script
    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
    async
    defer
  ></script>
</svelte:head>
<svelte:window on:message={handleMessageFromParent} />
