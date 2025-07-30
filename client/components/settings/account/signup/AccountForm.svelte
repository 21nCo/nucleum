<script lang="ts">
  import { page } from "$app/stores";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import {
    postMessageToParent,
    postTokenToExtension
  } from "$lib/client/utils/embed.utils";
  import { isValidEmail } from "$lib/shared/utils/text.utils";
  import { onMount } from "svelte";
  import OAuthButtons from "../../../oauth/OAuthButtons.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import account from "$lib/client/stores/account.store";
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { performApiCall } from "$lib/client/utils/network.utils";
  import { Action } from "$lib/client/types/action.enum";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  export let isSignup = false;
  export let currentProgress: string | undefined = undefined;
  let email = "";
  let pass = "";
  let nickName = "";
  let error: string | null = null;
  let isTrusted = true;
  let actionInProgress = false;
  let isLoginFromExtension = false;
  onMount(() => {
    postMessageToParent(EmbedMessage.MOUNT);
    const isSignupQueryParam = $page.url.searchParams.get("signup");
    if (isSignupQueryParam && isSignupQueryParam === "true") isSignup = true;
    const isLoginFromExtensionParam = $page.url.searchParams.get(
      AppSearchParam.EXT
    );
    if (isLoginFromExtensionParam && isLoginFromExtensionParam === "true") {
      isLoginFromExtension = true;
      console.log("isLoginFromExtension", isLoginFromExtension);
    }
  });
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
        <!-- <button
        class="flex items-center gap-2 w-full"
        on:click={() => {
          isTrusted = !isTrusted;
        }}
      >
        <input type="checkbox" class="h-4 w-4" bind:checked={isTrusted} />
        <div class="text-fgs3">Trust this device for 30 days</div>
      </button> -->
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
        on:click={handleClick}
      />
    </div>
  {/if}
  {#if isLoginFromExtension}
    <div class="flex flex-col gap-2 justify-center items-center w-full">
      <div class="text-h4 text-center w-full">
        Thanks for installing Memotron extension.
      </div>
      <div class="text-fgs3 text-b2 text-center">
        Click continue to login to your account.
      </div>
    </div>
  {/if}
  {#if $appStore.isDebugMode}
    <div class="w-full flex justify-center items-center text-fgs3 text-b3 px-4">
      <hr class="grow border-t border-bgs4" />
      <div class="px-2">or</div>
      <hr class="grow border-t border-bgs4" />
    </div>
  {/if}
  <div class="flex flex-col gap-8 justify-center self-center w-80">
    {#if isValidArrayWithData($appStore?.appData?.oAuthConfig)}
      <OAuthButtons bind:currentProgress />
    {/if}
    {#if !isLoginFromExtension}
      <Button
        label="Continue offline"
        icon="proceed"
        style={ButtonStyle.OUTLINED}
        on:click={async () => {
          await account.startOfflineSession();
          appStore.gotoPath("/");
        }}
      />
    {/if}
  </div>
</div>
