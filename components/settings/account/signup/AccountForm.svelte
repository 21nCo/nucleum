<script lang="ts">
  import { page } from "$app/stores";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import TextInput from "$lib/tidy/elements/input/TextInput.svelte";
  import InlineErrorMessage from "$lib/tidy/elements/text/InlineErrorMessage.svelte";
  import { account, appStore, windowObject } from "$lib/tidy/stores/app.store";
  import { EmbedMessage } from "$lib/tidy/types/embedMessage.enum";
  import { postMessageToParent } from "$lib/tidy/utils/embed.utils";
  import { isValidEmail } from "$lib/tidy/utils/text.utils";
  import { performApiCall } from "$lib/tidy/utils/utils";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import OAuthButtons from "./OAuthButtons.svelte";
  import { isValidArrayWithData } from "$lib/tidy/utils/obj.utils";
  export let isSignup = false;
  let email = "";
  let pass = "";
  let nickName = "";
  let error: string | null = null;
  let isTrusted = true;
  let actionInProgress = false;
  onMount(() => {
    postMessageToParent(EmbedMessage.MOUNT);
    const isSignupQueryParam = $page.url.searchParams.get("signup");
    if (isSignupQueryParam && isSignupQueryParam === "true") isSignup = true;
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
    await account.signIn(json, { isFromSignup: isSignup });
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

<div
  class="flex flex-col {$windowObject.scale > 0.6 ? 'gap-10' : 'gap-6'}"
  transition:fade
>
  <div class="flex flex-col gap-2 justify-center items-center w-80">
    <div class="flex flex-col w-full gap-4">
      <!-- <TextInput
          bind:value={nickName}
          label="What should we call you?"
          infoParams={{
            body: "Leave this blank if you don't want to share your name.",
            link: $appStore.appData?.urls?.privacy,
            linkText: "Learn more about our privay policy"
          }}
          placeholder="nickname or leave it empty"
        /> -->
      <TextInput
        bind:value={email}
        label="Email"
        isRequired={true}
        infoParams={isSignup
          ? {
              body:
                $appStore.appData.name +
                " doesn't store your email or password.",
              link: $appStore.appData?.urls?.privacy
            }
          : undefined}
        placeholder="username@email.com"
      />
      <TextInput
        bind:value={pass}
        label="Password"
        type="password"
        isRequired={true}
        placeholder="********"
        info={isSignup
          ? "Password must be 8-16 characters long and contain at least one lowercase letter, one uppercase letter, one number and one special character."
          : ""}
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
      width="w-full"
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
  {#if isValidArrayWithData($appStore?.appData?.oAuthConfig)}
    <div class="w-full flex justify-center items-center text-fgs3 text-b3 px-4">
      <hr class="grow border-t border-bgs4" />
      <div class="px-2">or</div>
      <hr class="grow border-t border-bgs4" />
    </div>
    <div class="w-full flex justify-center">
      <OAuthButtons />
    </div>
  {/if}
</div>
