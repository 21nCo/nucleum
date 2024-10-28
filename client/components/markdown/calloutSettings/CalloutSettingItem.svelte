<script lang="ts">
  import Avatar from "$lib/client/elements/avatarPicker/Avatar.svelte";
  import ColorPicker from "$lib/client/elements/colorPicker/ColorPicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { AvatarPickerContext } from "$lib/client/types/avatar.type";
  import type { ICalloutSetting } from "../md.type";
  export let setting: ICalloutSetting;
  function handleLabelChange(e: CustomEvent<string>) {
    // TODO
  }
</script>

<div class="flex items-center gap-2 w-full">
  <div class="flex w-24 h-full">
    <Avatar
      avatar={setting.avatar}
      isInEditMode={true}
      context={AvatarPickerContext.CALLOUT_AVATAR}
    />
  </div>
  <TextInput value={setting.label} on:change={handleLabelChange} />
  <ColorPicker hue={setting.color} isShowPreview={false} />
</div>
