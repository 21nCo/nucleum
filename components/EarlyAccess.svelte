<script lang="ts">
  import Button from "../elements/Button.svelte";
  import TextInput from "../elements/TextInput.svelte";
  import { app } from "../stores/app.store";
  import { Size } from "../types/size.enum";
  import { performApiCall } from "../utils/utils";
  let email = "";
  let message = "";
  async function onSubscribe() {
    let response = await performApiCall(
      "subscribe",
      "POST",
      JSON.stringify({ email, app, context: "earlyaccess" })
    );
    if (response && response.ok) {
      let jsonValue = await response.json();
      if (jsonValue) {
        message = "Subscribed successfully!";
      }
      setTimeout(() => {
        message = "";
        email = "";
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
  {#if message}
    <div class="absolute text-fgs2 -bottom-1/2">{message}</div>
  {/if}
</div>
