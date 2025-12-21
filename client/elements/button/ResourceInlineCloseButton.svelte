<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { appStore } from "@21n/stores/app.store";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  import { Size } from "@21n/types/size.enum";
  export let id: string;
  export let accessMode: AccessMode;
  export let parentBgIndex: number = 1;
  export let additionalAccessModes: AccessMode[] = [];
  const elementId = id + "-closeButton-" + generateSimpleRandomId();

  $: tooltip = accessMode === AccessMode.FULL ? "Close full screen" : "Close";
</script>

{#if accessMode === AccessMode.SPLIT || accessMode === AccessMode.FULL || accessMode === AccessMode.FSPLIT || accessMode === AccessMode.SHEET || additionalAccessModes.includes(accessMode)}
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
        if (accessMode === AccessMode.FULL) {
          appStore.toggleFullScreen(accessMode, id);
        } else {
          appStore.closeResource({ id, accessMode });
        }
      }}
    />
  </div>
{/if}
