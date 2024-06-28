<script lang="ts">
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { Direction } from "$lib/client/types/direction.enum";
  import Button from "./Button.svelte";
  export let path: string;
  export let position: Direction = Direction.TopRight;
</script>

<div
  class="fixed m-4 rounded-full bg-bgs4 w-14 h-14 flex justify-center items-center z-100 {position ===
    Direction.BottomRight || position === Direction.TopRight
    ? 'right-0'
    : 'left-0'} {position === Direction.BottomLeft ||
  position === Direction.BottomRight
    ? 'bottom-0'
    : 'top-0'}"
>
  <Button
    icon="cross"
    tooltip="close"
    on:click={() => {
      console.log("ModalCloseButton", { path });
      appStore.closeResource();
      modalEvent.hideSpecific(path, "ModalCloseButton.svelte");
    }}
  />
</div>
