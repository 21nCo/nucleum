<script lang="ts">
  import { page } from "$app/stores";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import TextInput from "$lib/tidy/elements/input/TextInput.svelte";
  import Link from "$lib/tidy/elements/text/Link.svelte";
  import { account, appStore } from "$lib/tidy/stores/app.store";
  import { isValidEmail } from "$lib/tidy/utils/text.utils";
  import { performApiCall } from "$lib/tidy/utils/utils";
  import { onMount } from "svelte";
  export let isSignup = false;
  let email = "";
  let pass = "";
  let confirmPass = "";
  let nickName = "";
  let error: string | null = null;
  let isTrusted = false;
  let actionInProgress = false;
  onMount(() => {
    const isSignupQueryParam = $page.url.searchParams.get("signup");
    if (isSignupQueryParam && isSignupQueryParam === "true") isSignup = true;
  });
  async function onSinginClicked() {
    if (!isValidSinginData()) return;
    actionInProgress = true;
    const response = await performApiCall(
      "account/signin",
      "POST",
      JSON.stringify({ email: email.toLowerCase(), pass, isTrusted })
    );
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
    account.signIn(json);
    actionInProgress = false;
  }
  async function onSignupClicked() {
    if (!isValidSignupData()) return;
    actionInProgress = true;
    const response = await performApiCall(
      "account/signup",
      "POST",
      JSON.stringify({ email: email.toLowerCase(), pass, nickName })
    );
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
    account.signIn(json);
    actionInProgress = false;
  }
  function isValidSignupData() {
    if (!email || !pass || !confirmPass) {
      showError("Please fill all the fields.");
      return false;
    }
    if (!isValidEmail(email)) {
      showError("Please enter a valid email address.");
      return false;
    }
    if (pass !== confirmPass) {
      showError("Passwords do not match.");
      return false;
    }
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
    setTimeout(() => {
      error = null;
    }, 3000);
  }
</script>

<div class="flex flex-col gap-8 justify-center items-center">
  {#if isSignup}
    <div class="flex flex-col gap-4 w-96 px-4">
      <TextInput
        bind:value={nickName}
        label="What should we call you?"
        infoParams={{
          body: "Leave this blank if you don't want to share your name.",
          link: $appStore.appData.urls.privacy,
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
        label="Email address"
        isRequired={true}
        infoParams={{
          body:
            $appStore.appData.name + " doesn't store your email or password.",
          link: $appStore.appData.urls.privacy,
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
      <TextInput
        bind:value={confirmPass}
        label="Confirm Password"
        type="password"
        isRequired={true}
        placeholder="********"
      />
    </div>
  {:else}
    <div class="flex flex-col gap-4 w-96 px-4">
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
      <div class="w-full flex justify-end">
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
  <div class="h-6">
    {#if error}
      <div class="text-ar">{error}</div>
    {/if}
  </div>
  <div class="flex gap-2">
    <Button
      label={isSignup
        ? actionInProgress
          ? "Signing up..."
          : "Signup"
        : actionInProgress
        ? "Signing in..."
        : "Signin"}
      type="primary"
      isDisabled={actionInProgress}
      on:click={isSignup ? onSignupClicked : onSinginClicked}
    />
    <Button
      label="{isSignup ? 'Signin' : 'Signup'} instead"
      on:click={() => {
        isSignup = !isSignup;
      }}
    />
  </div>
</div>
