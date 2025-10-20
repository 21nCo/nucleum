<script lang="ts">
  import AvatarPicker from "@21n/elements/avatarPicker/AvatarPicker.svelte";
  import {
    AvatarPickerContext,
    AvatarType,
    type IAvatar
  } from "@21n/types/avatar.type";
  import { Size } from "@21n/types/size.enum";
  import AvatarRenderer from "@21n/elements/avatarPicker/AvatarRenderer.svelte";
  import { createEventDispatcher } from "svelte";
  import { objIsEmpty } from "@21n/shared-utils/obj.utils";
  import { popover } from "@21n/actions/popover.action";
  import { Placement } from "@21n/types/direction.enum";
  const dispatch = createEventDispatcher();
  export let avatar: IAvatar | undefined = undefined;
  export let size: Size = Size.md;
  export let isInEditMode = false;
  export let context: AvatarPickerContext = AvatarPickerContext.DEFAULT;
  export let changeCallback: (avatar: IAvatar) => void = () => {};
  let ref: any;
  function handleAvatarEmitted(avatarVal: any) {
    if (!avatarVal) return;
    //TODO - send avatar type from avatar picker itself
    if ("color" in avatarVal) {
      avatarVal.type = AvatarType.ICON;
    } else {
      avatarVal.type = AvatarType.EMOJI;
    }
    avatar = avatarVal;
    dispatch("change", avatarVal);
    changeCallback?.(avatarVal);
    closePopover();
  }
  function handleDeleteEmitted() {
    avatar = undefined;
    dispatch("change", avatar);
    closePopover();
  }

  function closePopover() {
    ref.dispatchEvent(new CustomEvent("hide"));
  }
</script>

{#if avatar && !isInEditMode}
  <AvatarRenderer {avatar} {size} />
{:else if isInEditMode}
  <button
    class={"flex justify-center items-center w-full h-full text-b1 text-fgs3 rounded-md border border-brs3 border-dashed hover:bg-bgs2 hover:text-fgs2"}
    use:popover={{
      content: AvatarPicker,
      isRenderAsModalForCW: true,
      cwModalPosition: Placement.Top,
      id: "avatar-picker-popover",
      componentProps: {
        avatarClickCallback: handleAvatarEmitted,
        deleteCallback: handleDeleteEmitted,
        closeCallback: closePopover,
        context
      }
    }}
    bind:this={ref}
  >
    {#if avatar && !objIsEmpty(avatar) && (avatar.code || avatar.file)}
      <AvatarRenderer {avatar} {size} />
    {:else}
      +
    {/if}
  </button>
{/if}
