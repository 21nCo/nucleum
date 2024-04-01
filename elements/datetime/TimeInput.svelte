<script lang="ts">
  import view from "$lib/tidy/stores/view.store";
  export let value: string | number = "";
  export let placeholder: string = "Time";
  let classList =
    "rounded-md outline-none p-2 bg-bgs2 w-full focus:outline focus:outline-aps1";
</script>

<input
  type="time"
  bind:value
  on:change
  class="{$view.isPortrait ? 'w-24' : 'w-40'}  {classList}"
  {placeholder}
/>
