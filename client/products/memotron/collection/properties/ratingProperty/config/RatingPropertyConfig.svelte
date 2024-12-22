<script lang="ts">
  import type {
    IRatingProperty,
    IRatingPropertyConfig
  } from "$lib/client/products/memotron/collection/properties/property.type";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import RatingPropertyPreview from "./RatingPropertyPreview.svelte";
  import { resolvePropertyDefaultConfig } from "../../property.utils";
  import RatingAvatarPicker from "./RatingAvatarPicker.svelte";
  import { popover } from "$lib/client/actions/popover.action";
  export let property: IRatingProperty;
  let popoverRef: HTMLElement;

  if (!property.config || !property.config?.avatar) {
    property.config = resolvePropertyDefaultConfig(
      property.type
    ) as IRatingPropertyConfig;
  }
  function onAvatarSelect(icon: string) {
    if (!property.config || !icon) return;
    property.config.avatar = icon;
    if (popoverRef) popoverRef.dispatchEvent(new CustomEvent("hide"));
  }
</script>

{#if property.config?.avatar}
  <div class="flex gap-2 px-3 w-full h-full items-center">
    <div
      class="w-1/5 flex items-center gap-2"
      bind:this={popoverRef}
      use:popover={{
        content: RatingAvatarPicker,
        componentProps: {
          onAvatarSelect
        }
      }}
    >
      <Icon icon={"ph:" + property.config.avatar} size={Size.md} />
      <Icon icon="ph:caret-down-light" size={Size.sm} />
    </div>
    <span class="flex gap-2 items-center w-4/5 h-full">
      <Divider
        orientation={Orientation.Vertical}
        colorStrength={ColorStrength.Strong}
      />
      <RatingPropertyPreview avatar={property.config?.avatar} value={0} />
    </span>
  </div>
{/if}
