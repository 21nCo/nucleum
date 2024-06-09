<script lang="ts">
  import { borderClass } from "$lib/client/utils/theme.utils";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import appearance from "$lib/client/stores/appearance.store";
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
  class="px-2 py-1 rounded-md border {borderClass(
    $appearance,
    ColorStrength.Strong
  )}"
  on:click={onClick}
>
  {#if label}
    {label}
  {:else if isAddNew}
    <span class="text-aps1"> + Add new tag</span>
  {/if}
</button>
