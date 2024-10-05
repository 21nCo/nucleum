<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";

  import Button from "./elements/Button.svelte";

  export let email: string;
  export let onSubscribe: () => void;
</script>

<div
  class="flex items-center justify-center gap-8 mo:gap-4 h-[57px] mo:flex-col w-full mt-8 tp:mt-17"
>
  <div class="tp:w-[524px] w-full h-full">
    <input
      type="email"
      bind:value={email}
      placeholder="Enter your email address"
      class="w-full h-full bg-bgs1 text-fgs1 border border-brs4 p-4 rounded-lg text-[15px]"
    />
  </div>
  <Button isShort={true} label="Get early access" on:click={onSubscribe} />
</div>
