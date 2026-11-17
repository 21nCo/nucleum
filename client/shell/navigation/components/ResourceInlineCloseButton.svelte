<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import Button from "@21n/ui/elements/button/Button.svelte";
  import {
    ButtonStyle,
    ButtonVariant
  } from "@21n/ui/elements/button/button.type";

  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  import { Size } from "@21n/ui/elements/size.enum";
  let {
    id,
    accessMode,
    parentBgIndex = 1,
    additionalAccessModes = [],
    onClose = undefined
  }: {
    id: string;
    accessMode?: AccessMode;
    parentBgIndex?: number;
    additionalAccessModes?: AccessMode[];
    /**
     * Closes the resource within its host page, such as an item shown in a
     * space; when set, the button shows in any mode and calls it instead.
     */
    onClose?: () => void;
  } = $props();
  const elementIdSuffix = generateSimpleRandomId();
  const elementId = $derived(`${id}-closeButton-${elementIdSuffix}`);
</script>

{#if onClose || accessMode === AccessMode.BESIDE_BASE || accessMode === AccessMode.BESIDE_PAGE || accessMode === AccessMode.SHEET || (accessMode !== undefined && additionalAccessModes.includes(accessMode))}
  <div
    class="flex justify-center items-center"
    id={elementId}
    data-accessMode={accessMode}
  >
    <Button
      icon="cross"
      ariaLabel="Close"
      tooltip="Close"
      style={ButtonStyle.OUTLINED}
      type={ButtonVariant.DANGER}
      {parentBgIndex}
      size={Size.sm}
      onclick={() => {
        if (onClose) onClose();
        else navigation.closeResource({ id, accessMode });
      }}
    />
  </div>
{/if}
