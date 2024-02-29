<script lang="ts">
  import { modalEvent } from "$lib/tidy/stores/app.store";
  import Button from "./Button.svelte";
  export let path: string;
</script>

<div
  class="fixed right-0 top-0 m-4 rounded-full bg-bgs4 w-10 h-10 flex justify-center items-center z-100"
>
  <Button
    icon="cross"
    tooltip="close"
    on:click={() => {
      modalEvent.hideSpecific(path);
    }}
  />
</div>
