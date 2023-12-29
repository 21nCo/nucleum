<script lang="ts">
  import { page } from "$app/stores";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import TextInput from "$lib/tidy/elements/input/TextInput.svelte";
  import InlineErrorMessage from "$lib/tidy/elements/text/InlineErrorMessage.svelte";
  import Link from "$lib/tidy/elements/text/Link.svelte";
  import { account, appStore } from "$lib/tidy/stores/app.store";
  import { EmbedMessage } from "$lib/tidy/types/embedMessage.enum";
  import { postMessageToParent } from "$lib/tidy/utils/embed.utils";
  import { isValidEmail } from "$lib/tidy/utils/text.utils";
  import { performApiCall } from "$lib/tidy/utils/utils";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  export let isSignup = false;
  let email = "";
  let pass = "";
  let confirmPass = "";
  let nickName = "";
  let error: string | null = null;
  let isTrusted = false;
  let actionInProgress = false;
  onMount(() => {
    postMessageToParent(EmbedMessage.MOUNT);
    const isSignupQueryParam = $page.url.searchParams.get("signup");
    if (isSignupQueryParam && isSignupQueryParam === "true") isSignup = true;
  });
  async function onSinginClicked() {
    if (!isValidSinginData()) return;
    actionInProgress = true;
    const response = await performApiCall("account/signin", "POST", {
      email: email.toLowerCase(),
      pass,
      isTrusted,
    });
    if (!response || !response.ok) {
      showError();
      return;
    }
    const json = await response.json();
    if (!json || !json.token) {
      if (json.result === 0) {
        showError("User not found. Please signup instead.");
        return;
      } else if (json.result === -1) {
        showError("Invalid password.");
        return;
      }
      showError();
      return;
    }
    await account.signIn(json);
    actionInProgress = false;
  }
  async function onSignupClicked() {
    if (!isValidSignupData()) return;
    actionInProgress = true;
    const response = await performApiCall("account/signup", "POST", {
      email: email.toLowerCase(),
      pass,
      nickName,
    });
    if (!response || !response.ok) {
      showError();
      return;
    }
    const json = await response.json();
    if (!json || !json.token) {
      if (json.result > 0) {
        showError("User already exists. Please signin instead");
        return;
      }
      showError();
      return;
    }
    await account.signIn(json, { isFromSignup: true });
    actionInProgress = false;
  }
  function isValidSignupData() {
    if (!email || !pass) {
      showError("Please fill all the fields.");
      return false;
    }
    if (!isValidEmail(email)) {
      showError("Please enter a valid email address.");
      return false;
    }
    // if (pass !== confirmPass) {
    //   showError("Passwords do not match.");
    //   return false;
    // }
    if (!isValidPasswordChoice()) return;
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
  function isValidSinginData() {
    if (!email || !pass) {
      showError("Please fill all the fields.");
      return false;
    }
    if (!isValidEmail(email)) {
      showError("Please enter a valid email address.");
      return false;
    }
    return true;
  }
  function showError(message: string | null = null) {
    actionInProgress = false;
    error = message ?? "Something went wrong. Please try again later.";
  }
</script>

<div class="flex flex-col gap-8 justify-center items-center" transition:fade>
  {#if isSignup}
    <div class="flex flex-col gap-4 w-80 md:w-96 px-4">
      <TextInput
        bind:value={nickName}
        label="What should we call you?"
        infoParams={{
          body: "Leave this blank if you don't want to share your name.",
          link: $appStore.appData?.urls?.privacy,
          linkText: "Learn more about our privay policy",
        }}
        placeholder="nickname or leave it empty"
      />
      <!-- <TextInput
        bind:value={lastName}
        label="Last name"
        isRequired={true}
        placeholder="Legend"
      /> -->
      <TextInput
        bind:value={email}
        label="Email"
        isRequired={true}
        infoParams={{
          body:
            $appStore.appData.name + " doesn't store your email or password.",
          link: $appStore.appData?.urls?.privacy,
        }}
        placeholder="username@email.com"
      />
      <TextInput
        bind:value={pass}
        label="Password"
        type="password"
        isRequired={true}
        placeholder="********"
        info="Password must be 8-16 characters long and contain at least one lowercase letter, one uppercase letter, one number and one special character."
      />
      <!-- <TextInput
        bind:value={confirmPass}
        label="Confirm Password"
        type="password"
        isRequired={true}
        placeholder="********"
      /> -->
    </div>
  {:else}
    <div class="flex flex-col gap-4 w-80 md:w-96 px-4">
      <TextInput
        bind:value={email}
        label="Email address"
        isRequired={true}
        placeholder="john@legend.com"
      />
      <TextInput
        bind:value={pass}
        label="Password"
        type="password"
        isRequired={true}
        placeholder="********"
      />
      <div class="w-full flex justify-end text-b3">
        <Link href="forgot-password" label="Forgot password?" />
      </div>
      <button
        class="flex items-center gap-2 w-full"
        on:click={() => {
          isTrusted = !isTrusted;
        }}
      >
        <input type="checkbox" class="h-4 w-4" bind:checked={isTrusted} />
        <div class="text-fgs3">Trust this device for 30 days</div>
      </button>
    </div>
  {/if}
  <InlineErrorMessage bind:error />
  <div class="flex flex-col gap-4">
    <Button
      width="w-full"
      icon="mail"
      label={isSignup
        ? actionInProgress
          ? "Signing up..."
          : "Sign up using email"
        : actionInProgress
          ? "Signing in..."
          : "Sign in using email"}
      type="primary"
      isDisabled={actionInProgress}
      on:click={isSignup ? onSignupClicked : onSinginClicked}
    />
    <div class="w-full flex justify-center text-fgs2 text-b3">or</div>
    <Button
      width="w-full"
      icon="google"
      label={isSignup ? "Sign up using Google" : "Sign in usign Google"}
    />
    <!-- <Button
      label="{isSignup ? 'Signin' : 'Signup'} instead"
      on:click={() => {
        isSignup = !isSignup;
      }}
    /> -->
  </div>
</div>
