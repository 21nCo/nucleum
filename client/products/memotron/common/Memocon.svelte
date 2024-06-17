<script lang="ts">
  import { isInEditMode } from "$lib/client/stores/app.store";
  import AvatarPicker from "$lib/client/elements/avatarPicker/AvatarPicker.svelte";
  import { captureStore } from "../capture/capture.store";
  import { AvatarType, type IAvatar } from "$lib/client/types/avatar.type";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  export let avatar: IAvatar | undefined = undefined;
  export let size: Size = Size.md;
  let ref: any;
  $isInEditMode = true;
  function handleAvatarEmitted(event: CustomEvent<any>) {
    console.log("handleAvatarEmitted", event.detail);
    if (event.detail) {
      avatar = event.detail;
      if (!avatar) return;
      //TODO - send avatar type from avatar picker itself
      if ("color" in avatar) {
        avatar.type = AvatarType.ICON;
      } else {
        avatar.type = AvatarType.EMOJI;
      }
      $captureStore.avatar = avatar;
    }
  }
  function handleDeleteEmitted() {
    avatar = undefined;
    $captureStore.avatar = avatar;
    ref.hide();
  }
</script>

<Popover bind:this={ref} triggerClass="flex">
  <div>
    {#if avatar && !$isInEditMode}
      <AvatarView {avatar} {size} />
    {:else if $isInEditMode}
      <button
        class={"w-8 h-8 text-b1 text-bgs4 rounded-md border border-bgs4 border-dotted hover:bg-bgs4 hover:text-fgs2"}
      >
        {#if avatar}
          <AvatarView {avatar} {size} />
        {:else}
          +
        {/if}
      </button>
    {/if}
  </div>
  <svelte:fragment slot="popover">
    <AvatarPicker
      on:avatarClicked={handleAvatarEmitted}
      on:delete={handleDeleteEmitted}
      on:close={() => ref.hide()}
    />
  </svelte:fragment>
</Popover>
