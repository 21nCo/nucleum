<script lang="ts">
  import Presets from "./Presets.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  function handleEdit(event: any) {
    if (!event.detail?.id) return;
    appStore.runAction(PointronAction.EDIT_PRESET, {
      componentParams: { id: event.detail.id }
    });
  }
</script>

<div class="w-full h-full overflow-y-auto flex flex-col gap-2 dp:gap-3">
  <Presets isInEditMode={true} on:edit={handleEdit} isSettingsContext={true} />
</div>
