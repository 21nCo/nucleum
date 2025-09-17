<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  export let id: string;
  export let accessMode: ResourceAccessMode;
  const elementId = id + "-closeButton-" + generateSimpleRandomId();
</script>

{#if accessMode === ResourceAccessMode.SPLIT || accessMode === ResourceAccessMode.FULL || accessMode === ResourceAccessMode.FSPLIT}
  <div
    class="flex justify-center items-center"
    id={elementId}
    data-accessMode={accessMode}
  >
    <Button
      icon="cross"
      tooltip="Close"
      style={ButtonStyle.OUTLINED}
      on:click={() => {
        appStore.closeResource({ id, accessMode });
      }}
    />
  </div>
{/if}
