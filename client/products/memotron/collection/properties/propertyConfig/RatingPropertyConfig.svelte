<script lang="ts">
  import type { IProperty } from "$lib/client/products/memotron/collection/properties/property.type";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import AvatarPicker from "$lib/client/elements/avatarPicker/AvatarPicker.svelte";
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import {
    AvatarPickerContext,
    AvatarType
  } from "$lib/client/types/avatar.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import RatingPropertyPreview from "./RatingPropertyPreview.svelte";
  export let property: IProperty;
  let ref: any;
  let popoverOptions = {};
  if (!property.config || !property.config?.ratingAvatar) {
    property.config = {
      ratingAvatar: {
        type: AvatarType.ICON,
        code: "&#XF09A",
        name: "star_outline",
        frequency: 0,
        isFilled: false,
        color: "#C14D8A"
      }
    };
  }
  function onavatarclick(e: CustomEvent) {
    console.log("onavatarclick", e.detail);
    if (property.config) property.config.ratingAvatar = e.detail;
  }
</script>

{#if property.config?.ratingAvatar}
  <div class="flex gap-2 w-full h-full items-center">
    <Popover
      bind:this={ref}
      triggerClass="flex items-center w-1/5 h-full gap-2"
      options={popoverOptions}
    >
      <AvatarRenderer avatar={property.config?.ratingAvatar} size={Size.md} />
      <Icon icon="chevdown" />
      <svelte:fragment slot="popover">
        <!-- TODO - only show icons that can be fillable -->
        <AvatarPicker
          on:avatarClicked={onavatarclick}
          on:close={() => ref.hide()}
          context={AvatarPickerContext.RATING_AVATAR}
        />
      </svelte:fragment>
    </Popover>
    <span class="flex gap-2 items-center w-4/5 h-full">
      <Divider
        orientation={Orientation.Vertical}
        colorStrength={ColorStrength.Strong}
      />
      <RatingPropertyPreview avatar={property.config?.ratingAvatar} value={0} />
    </span>
  </div>
{/if}
