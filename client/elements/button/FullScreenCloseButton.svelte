<script lang="ts">
  import { Placement, tooltip } from "$lib/client/actions/popover.action";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "../Icon.svelte";
  export let path: string | undefined = undefined;
</script>

<div
  class="fixed m--2 w-10 h-10 rounded-bl-md bg-ars1 opacity-70 hover:opacity-100 flex justify-center items-center z-[1000] top-0 right-0"
  use:tooltip={{ text: "Close", direction: Placement.Left }}
>
  <Icon
    icon="ph:x-light"
    class="stroke-bgs1"
    on:click={() => {
      appStore.closeResource({ accessMode: ResourceAccessMode.FULL });
      if (path) modalEvent.hide(path, "ModalCloseButton.svelte");
    }}
  />
</div>
