<script lang="ts">
  import type {
    IRatingProperty,
    IRatingPropertyConfig
  } from "$lib/client/components/collection/properties/property.type";
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
  let isPopoverOpen: boolean = false;

  if (!property.config || !property.config?.avatar) {
    property.config = resolvePropertyDefaultConfig(
      property.type
    ) as IRatingPropertyConfig;
  }
  function onAvatarSelect(icon: string) {
    if (!property.config || !icon) return;
    property.config.avatar = icon;
    // if (popoverRef) popoverRef.dispatchEvent(new CustomEvent("hide"));
  }

  function onSizeSelect(size: number) {
    if (!property.config || typeof size !== "number") return;
    property.config.scale = size;
  }
</script>

{#if property.config?.avatar}
  <div class="flex pr-3 w-full h-full items-center">
    <div
      class="w-1/4 flex items-center justify-between px-3 gap-2 h-full hover:bg-bgs2 rounded-md"
      bind:this={popoverRef}
      use:popover={{
        content: RatingAvatarPicker,
        id: `rating-property-config-popover-${property.id || "default"}`,
        componentProps: {
          onAvatarSelect,
          onSizeSelect,
          scale: property.config?.scale,
          avatar: property.config?.avatar
        }
      }}
      on:change={(e) => {
        isPopoverOpen = e.detail?.open;
      }}
    >
      <Icon icon={"ph:" + property.config.avatar} size={Size.md} />
      <Icon
        icon={isPopoverOpen ? "ph:caret-up-light" : "ph:caret-down-light"}
        size={Size.sm}
      />
    </div>
    <span class="flex gap-2 items-center w-3/4 h-full">
      <Divider
        orientation={Orientation.Vertical}
        colorStrength={ColorStrength.Strong}
      />
      {#if !property.config?.scale || property.config?.scale <= 6}
        <RatingPropertyPreview
          avatar={property.config?.avatar}
          value={0}
          count={property.config?.scale ?? 5}
        />
      {:else}
        <span class="text-fgs3 text-b3">Out of {property.config?.scale}</span>
      {/if}
    </span>
  </div>
{/if}
