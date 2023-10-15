<script lang="ts">
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import type { PopupEvent } from "$lib/tidy/types/popup.type";

  export let popup: PopupEvent;
  let dialogRef: HTMLDialogElement;
  $: console.log({ popup });
  $: if (dialogRef && popup.isShow) dialogRef.showModal();
  //todo urgent - to close modal when clicked on other parts of the app or overlay
</script>

<dialog
  bind:this={dialogRef}
  class="popover rounded-md flex flex-col bg-bgs1 text-fgs1"
>
  <!-- {popup.path} -->
  <ComponentResolver path={popup.path} params={{ id: popup.id }} />
</dialog>
