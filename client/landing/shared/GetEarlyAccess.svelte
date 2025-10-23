<script lang="ts">
  import TextInput from "@21n/elements/input/TextInput.svelte";

  import Button from "@21n/landing/shared/elements/Button.svelte";

  export let email: string;
  export let onSubscribe: () => void;
</script>

<div
  class="flex items-center justify-center gap-8 mo:gap-4 h-12 mo:flex-col w-full mt-8 tp:mt-17"
>
  <div class="tp:w-[524px] w-full h-full">
    <input
      type="email"
      bind:value={email}
      placeholder="Enter your email address"
      class="w-full h-full bg-bgs1 text-fgs1 border border-brs3 p-4 rounded-lg text-[15px] focus:outline-none focus:border-aps1"
    />
  </div>
  <Button isShort={true} label="Get early access" on:click={onSubscribe} />
</div>
