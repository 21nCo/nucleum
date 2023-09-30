<script lang="ts">
  import Button from "../elements/Button.svelte";
  import TextInput from "../elements/input/TextInput.svelte";
  import { app } from "../stores/app.store";
  import { Size } from "../types/size.enum";
  import { isValidEmail, performApiCall } from "../utils/utils";
  let email = "";
  let message = "";
  let error: string | null = null;
  async function onSubscribe() {
    if (!email || !isValidEmail(email)) {
      error = "Please enter a valid email address";
      setTimeout(() => {
        error = null;
      }, 2000);
      return;
    } else {
      error = null;
    }
    let response = await performApiCall(
      "subscribe",
      "POST",
      JSON.stringify({ email, app, context: "earlyaccess" })
    );
    if (response && response.ok) {
      let jsonValue = await response.json();
      if (jsonValue && !jsonValue.error) {
        message = "Subscribed successfully!";
      } else {
        error = jsonValue.error;
      }
      setTimeout(() => {
        message = "";
        email = "";
        error = null;
      }, 2000);
    }
  }
</script>

<div class="relative flex flex-col w-full items-center">
  <div class="flex gap-4 flex-wrap justify-center items-center">
    <div class="w-full md:w-96">
      <TextInput
        size={Size.sm}
        placeholder="Your email address"
        bind:value={email}
      />
    </div>
    <div>
      <Button
        size={Size.sm}
        on:click={onSubscribe}
        label="Get Early Access"
        type="primary"
      />
    </div>
  </div>
  <div class="absolute text-b2 top-full">
    {#if message}
      <div class="text-fgs2">{message}</div>
    {/if}
    {#if error}
      <div class="text-red">{error}</div>
    {/if}
  </div>
</div>
