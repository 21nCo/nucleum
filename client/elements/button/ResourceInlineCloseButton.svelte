<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { Size } from "$lib/client/types/size.enum";
  export let id: string;
  export let accessMode: ResourceAccessMode;
  export let parentBgIndex: number = 1;
  export let additionalAccessModes: ResourceAccessMode[] = [];
  const elementId = id + "-closeButton-" + generateSimpleRandomId();

  $: tooltip =
    accessMode === ResourceAccessMode.FULL ? "Close full screen" : "Close";
</script>

{#if accessMode === ResourceAccessMode.SPLIT || accessMode === ResourceAccessMode.FULL || accessMode === ResourceAccessMode.FSPLIT || additionalAccessModes.includes(accessMode)}
  <div
    class="flex justify-center items-center"
    id={elementId}
    data-accessMode={accessMode}
  >
    <Button
      icon="cross"
      {tooltip}
      style={ButtonStyle.OUTLINED}
      type={ButtonVariant.DANGER}
      {parentBgIndex}
      size={Size.sm}
      on:click={() => {
        if (accessMode === ResourceAccessMode.FULL) {
          appStore.toggleFullScreen(accessMode, id);
        } else {
          appStore.closeResource({ id, accessMode });
        }
      }}
    />
  </div>
{/if}
