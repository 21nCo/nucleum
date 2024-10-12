<script lang="ts">
  import AvatarPicker from "$lib/client/elements/avatarPicker/AvatarPicker.svelte";
  import { AvatarType, type IAvatar } from "$lib/client/types/avatar.type";
  import { Size } from "$lib/client/types/size.enum";
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import { createEventDispatcher } from "svelte";
  import { objIsEmpty } from "$lib/shared/utils/obj.utils";
  import { popover } from "$lib/client/actions/popover.action";
  const dispatch = createEventDispatcher();
  export let avatar: IAvatar | undefined = undefined;
  export let size: Size = Size.md;
  export let isInEditMode = false;
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
      componentProps: {
        avatarClickCallback: handleAvatarEmitted,
        deleteCallback: handleDeleteEmitted,
        closeCallback: closePopover
      }
    }}
    bind:this={ref}
  >
    {#if avatar && !objIsEmpty(avatar)}
      <AvatarRenderer {avatar} {size} />
    {:else}
      +
    {/if}
  </button>
{/if}
