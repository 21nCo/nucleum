<script lang="ts">
  import Button from "$lib/tidy/elements/Button.svelte";
  import TextInput from "$lib/tidy/elements/TextInput.svelte";
  import Link from "$lib/tidy/elements/text/Link.svelte";
  import { account } from "$lib/tidy/stores/app.store";
  import { performApiCall } from "$lib/tidy/utils/utils";
  let email = "";
  let pass = "";
  let isSignin = true;
  let error: string | null = null;
  async function onSinginClicked() {
    const response = await performApiCall(
      "account/signin",
      "POST",
      JSON.stringify({ email, pass })
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
    account.signIn(json.token);
  }
  async function onSignupClicked() {
    const response = await performApiCall(
      "account/signup",
      "POST",
      JSON.stringify({ email, pass })
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
    account.signIn(json.token);
  }
  function showError(message: string | null = null) {
    error = message ?? "Something went wrong. Please try again later.";
    setTimeout(() => {
      error = null;
    }, 3000);
  }
</script>

<div class="flex flex-col gap-8 justify-center items-center">
  <div class="flex flex-col gap-4 w-96">
    <TextInput bind:value={email} label="Email address" />
    <TextInput bind:value={pass} label="Password" type="password" />
    <div class="w-full flex justify-end">
      <Link href="forgot-password" label="Forgot password?" />
    </div>
  </div>
  {#if error}
    <div class="text-red">{error}</div>
  {/if}
  <div class="flex gap-2">
    <Button
      label={isSignin ? "Signin" : "Signup"}
      type="primary"
      on:click={isSignin ? onSinginClicked : onSignupClicked}
    />
    <Button
      label="{isSignin ? 'Signup' : 'Signin'} instead"
      on:click={() => {
        isSignin = !isSignin;
      }}
    />
  </div>
</div>
