<script lang="ts">
  import { PointronPersistence } from "$lib/client/products/pointron/pointron.persistence";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  const localPersistance = new PointronPersistence();
  export let isExpandedMode: boolean = false;
</script>

<div class="flex gap-4">
  <Button
    icon="sync"
    label={isExpandedMode ? "sync" : undefined}
    size={isExpandedMode ? Size.xs : Size.md}
    on:click={async () => {
      await localPersistance.syncFocusState();
    }}
  />
  <Button
    icon="history"
    label={isExpandedMode ? "logs" : undefined}
    size={isExpandedMode ? Size.xs : Size.md}
    on:click={() => {
      appStore.runAction(PointronEventEnum.LOGS);
    }}
  />
</div>
