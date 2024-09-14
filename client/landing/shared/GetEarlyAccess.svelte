<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";

  import Button from "./elements/Button.svelte";

  export let email: string;
  export let onSubscribe: () => void;
</script>

<div
  class="flex items-center justify-center gap-8 mo:gap-4 h-[57px] mo:flex-col w-full mt-8 tp:mt-17"
>
  <div class="tp:w-[524px] w-full">
    <TextInput value={email} placeholder="Enter your email address" />
  </div>
  <Button
    label="Get early access"
    class="mo:w-full pt-1 pb-1 pl-8 pr-8"
    on:click={onSubscribe}
  />
</div>
