<script lang="ts">
  import { page } from "$app/stores";
  import Button from "@21n/elements/button/Button.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { EmbedMessage } from "@21n/types/embedMessage.enum";
  import {
    postMessageToParent,
    postTokenToExtension
  } from "@21n/utils/embed.utils";
  import { isValidEmail } from "@21n/shared-utils/text.utils";
  import { onMount } from "svelte";
  import OAuthButtons from "@21n/components/oauth/OAuthButtons.svelte";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import account from "@21n/stores/account.store";
  import view from "@21n/stores/view.store";
  import { Orientation } from "@21n/types/direction.enum";
  import { performApiCall } from "@21n/utils/network.utils";
  import { Action } from "@21n/types/action.enum";
  import Icon from "@21n/elements/Icon.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { ButtonStyle } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  let {
    isSignup: initialIsSignup = false,
    currentProgress = $bindable(),
    isLoginFromExtension = false,
    isSelfHosted = false
  }: {
    isSignup?: boolean;
    currentProgress?: string | undefined;
    isLoginFromExtension?: boolean;
    isSelfHosted?: boolean;
  } = $props();
  let isSignup = $state(false);
  let email = $state("");
  let pass = $state("");
  let nickName = $state("");
  let error = $state<string | null>(null);
  let isTrusted = true;
  let actionInProgress = $state(false);
  const mode = $derived(resolveMode(isLoginFromExtension, isSelfHosted));

  $effect(() => {
    isSignup = initialIsSignup;
  });

  onMount(() => {
    postMessageToParent(EmbedMessage.MOUNT);
    const isSignupQueryParam = $page.url.searchParams.get("signup");
    if (isSignupQueryParam && isSignupQueryParam === "true") isSignup = true;
  });

  function resolveMode(
    isLoginFromExtensionParam: boolean,
    isSelfHostedParam: boolean
  ) {
    if (isLoginFromExtensionParam) {
      return "cloud-only";
    } else if (isSelfHostedParam) {
      return "offline-only";
    }
    return "all";
  }

  async function handleClick() {
    if (!isValidFormData()) return;
    actionInProgress = true;
    const response = await performApiCall(
      "account/n/" + (isSignup ? "signup" : "signin"),
      "POST",
      {
        email: email.toLowerCase(),
        pass,
        isTrusted,
        nickName
      }
    );
    if (!response || !response.ok) {
      showError();
      actionInProgress = false;
      return;
    }
    const json = await response.json();
    console.log({ json });
    if (!json || !json.token) {
      if (json > 0) {
        showError("User already exists. Please signin instead");
      } else if (json === 0) {
        showError("User not found. Please signup instead.");
      } else if (json === -1) {
        showError("Invalid password.");
      } else {
        showError();
      }
      actionInProgress = false;
      return;
    }
    if (isLoginFromExtension) {
      postTokenToExtension(json);
      appStore.runAction(Action.EXTENSTION_LOGIN);
    } else await account.signIn(json, { isNewUser: isSignup });
    actionInProgress = false;
  }
  function isValidFormData() {
    if (!email || !pass) {
      showError("Please fill all the fields.");
      return false;
    }
    if (!isValidEmail(email)) {
      showError("Please enter a valid email address.");
      return false;
    }
    if (isSignup && !isValidPasswordChoice()) return;
    return true;
  }
  function isValidPasswordChoice() {
    if (pass.length < 8) {
      showError("Password must be at least 8 characters long.");
      return false;
    }
    if (pass.length > 16) {
      showError("Password must be at most 16 characters long.");
      return false;
    }
    if (!pass.match(/[a-z]/)) {
      showError("Password must contain at least one lowercase letter.");
      return false;
    }
    if (!pass.match(/[A-Z]/)) {
      showError("Password must contain at least one uppercase letter.");
      return false;
    }
    if (!pass.match(/[0-9]/)) {
      showError("Password must contain at least one number.");
      return false;
    }
    if (!pass.match(/[^a-zA-Z0-9]/)) {
      showError("Password must contain at least one special character.");
      return false;
    }
    return true;
  }

  function showError(message: string | null = null) {
    actionInProgress = false;
    error = message ?? "Something went wrong. Please try again later.";
  }

  async function onOfflineClick() {
    await account.startOfflineSession();
    appStore.gotoPath("/");
  }
</script>

<!-- transition:fade -->
<div class="flex flex-col w-96 {$view.scale > 0.6 ? 'gap-10' : 'gap-6'}">
  <!-- TODO - reenable email signin/signup upon completion of forgot password flow -->
  {#if $appStore.isDebugMode}
    <div class="flex flex-col gap-2 justify-center items-center">
      <div class="flex flex-col w-full gap-4">
        <TextInput
          bind:value={email}
          label={{
            label: "Email",
            orientation: Orientation.Vertical,
            tooltip: isSignup
              ? {
                  body:
                    $appStore.appData.name +
                    " doesn't store your email or password.",
                  action: $appStore.appData?.urls?.privacy
                }
              : undefined
          }}
          placeholder="username@email.com"
        />
        <TextInput
          bind:value={pass}
          id="password"
          label={{
            label: "Password",
            orientation: Orientation.Vertical,
            tooltip: isSignup
              ? {
                  body: "Password must be 8-16 characters long and contain at least one lowercase letter, one uppercase letter, one number and one special character."
                }
              : undefined
          }}
          type="password"
          placeholder="********"
        />
      </div>
      <InlineErrorMessage bind:error />
      <Button
        isExpandToFullWidth={true}
        type="primary"
        label={isSignup
          ? actionInProgress
            ? "Signing up..."
            : "Sign up with email"
          : actionInProgress
            ? "Signing in..."
            : "Sign in"}
        isLoading={actionInProgress}
        onclick={handleClick}
      />
    </div>
  {/if}
  {#if $appStore.isDebugMode}
    <div class="w-full flex justify-center items-center text-fgs3 text-b3 px-4">
      <hr class="grow border-t border-bgs4" />
      <div class="px-2">or</div>
      <hr class="grow border-t border-bgs4" />
    </div>
  {/if}

  <div class="flex flex-col justify-center self-center cw:w-80 w-96">
    {#if mode !== "offline-only"}
      <div
        class={cn("group flex flex-col justify-between gap-4 p-4", {
          "cw:h-fit h-72 bg-bgs1 border-t-transparent border-x-transparent border-t border-x border-brs3 hover:border-t-brs3 hover:border-x-brs3 hover:rounded-t-md rounded-t-md":
            mode === "all" && !$view.isPortrait
        })}
      >
        {#if mode === "all" && !$view.isPortrait}
          <div class="text-fgs3 text-center">Sync across devices</div>
        {/if}
        {#if isValidArrayWithData($appStore?.appData?.oAuthConfig)}
          <OAuthButtons bind:currentProgress />
        {/if}
        {#if !$view.isPortrait}
          <div
            class={cn(
              "text-fgs3 text-b3 text-center transition-opacity duration-300",
              {
                "opacity-80 group-hover:opacity-100": mode === "all"
              }
            )}
          >
            Includes a 14-day free trial. No credit card required.
          </div>
        {/if}
      </div>
    {/if}
    {#if mode !== "cloud-only" && $view.isPortrait}
      <div class="flex items-center cw:w-80 w-96 p-4 mx-auto">
        <Button
          label="Continue offline"
          icon="proceed"
          size={Size.lg}
          isExpandToFullWidth={true}
          style={ButtonStyle.OUTLINED}
          onclick={onOfflineClick}
        />
      </div>
    {:else if mode !== "cloud-only" && !$view.isPortrait}
      <button
        class={cn(
          "group flex flex-col justify-center items-center w-full  p-3",
          {
            "cw:h-48 h-60 bg-bgs1 hover:border-x-brs3 hover:border-b-brs3 rounded-b-md border border-x-transparent border-b-transparent border-brs3":
              mode === "all"
          }
        )}
        onclick={onOfflineClick}
      >
        <div
          class="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300 my-auto"
        >
          <Icon icon="proceed" />
          Continue offline
        </div>
        {#if mode === "all"}
          <div
            class="text-fgs3 text-b3 opacity-80 group-hover:opacity-100 transition-opacity duration-300"
          >
            Single device use & free forever. No signup required.
          </div>
        {/if}
      </button>
    {/if}
  </div>
</div>
