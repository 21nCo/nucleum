<script lang="ts">
  import Button from "../elements/button/Button.svelte";
  import TextInput from "../elements/input/TextInput.svelte";
  import { Size } from "../types/size.enum";
  import { isValidEmail } from "$lib/shared/utils/text.utils";
  import { performApiCall } from "$lib/client/utils/network.utils";
  import GetEarlyAccess from "../landing/shared/GetEarlyAccess.svelte";
  import LandingButton from "../landing/shared/elements/Button.svelte";
  import { goto } from "$app/navigation";
  export let url: string | undefined = undefined;
  export let version: "V1" | "V2" | "V3" = "V1";
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
    let response = await performApiCall("subscribe", "POST", {
      email,
      context: "earlyaccess"
    });
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
  {#if version === "V1"}
    <div class="flex gap-4 flex-wrap justify-center items-center">
      <div class="w-full tp:w-96">
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
  {:else if version === "V2"}
    <GetEarlyAccess bind:email {onSubscribe} />
  {:else if version === "V3"}
    <div class="flex mo:flex-col gap-6 items-center justify-center">
      <LandingButton
        type="secondary"
        label="Read our mission"
        on:click={() => goto("/mission")}
      />
      <LandingButton
        type="primary"
        label="Get early access"
        on:click={() => {
          if (url) {
            window.location.href = url;
          } else {
            goto("/earlyaccess");
          }
        }}
      />
    </div>
  {/if}
  <div class="absolute text-b2 top-full">
    {#if message}
      <div class="text-fgs2">{message}</div>
    {/if}
    {#if error}
      <div class="text-ars1">{error}</div>
    {/if}
  </div>
</div>
