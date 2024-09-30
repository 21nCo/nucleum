<script lang="ts">
  import AvatarPicker from "$lib/client/elements/avatarPicker/AvatarPicker.svelte";
  import { AvatarType, type IAvatar } from "$lib/client/types/avatar.type";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import { createEventDispatcher } from "svelte";
  import { objIsEmpty } from "$lib/shared/utils/obj.utils";
  const dispatch = createEventDispatcher();
  export let avatar: IAvatar | undefined = undefined;
  export let size: Size = Size.md;
  export let isInEditMode = false;
  let ref: any;
  function handleAvatarEmitted(event: CustomEvent<any>) {
    if (event.detail) {
      avatar = event.detail;
      if (!avatar) return;
      //TODO - send avatar type from avatar picker itself
      if ("color" in avatar) {
        avatar.type = AvatarType.ICON;
      } else {
        avatar.type = AvatarType.EMOJI;
      }
      dispatch("change", avatar);
    }
  }
  function handleDeleteEmitted() {
    avatar = undefined;
    dispatch("change", avatar);
    ref.hide();
  }
  $: console.log({ avatar });
</script>

{#if avatar && !isInEditMode}
  <AvatarRenderer {avatar} {size} />
{:else if isInEditMode}
  <Popover bind:this={ref} triggerClass="flex w-full h-full">
    <button
      class={"flex justify-center items-center w-full h-full text-b1 text-fgs3 rounded-md border border-brs3 border-dashed hover:bg-bgs2 hover:text-fgs2"}
    >
      {#if avatar && !objIsEmpty(avatar)}
        <AvatarRenderer {avatar} {size} />
      {:else}
        +
      {/if}
    </button>

    <svelte:fragment slot="popover">
      <AvatarPicker
        on:avatarClicked={handleAvatarEmitted}
        on:delete={handleDeleteEmitted}
        on:close={() => ref.hide()}
      />
    </svelte:fragment>
  </Popover>
{/if}
