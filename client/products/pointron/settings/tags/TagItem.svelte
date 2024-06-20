<script lang="ts">
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { appStore } from "$lib/client/stores/app.store";
  export let label: string | undefined = undefined;
  export let id: string | undefined = undefined;
  export let isAddNew: boolean = false;
  function onClick() {
    if (isAddNew) {
      appStore.runAction(PointronEventEnum.ADD_TAG);
    } else {
      appStore.runAction(PointronEventEnum.EDIT_TAG, { id });
    }
  }
</script>

<button
  class="px-2 py-1 rounded-md border border-brs3 hover:bg-bgs2"
  on:click={onClick}
>
  {#if label}
    {label}
  {:else if isAddNew}
    <span class="text-aps1"> + Add new tag</span>
  {/if}
</button>
