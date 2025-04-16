<script lang="ts">
  import {
    activeSession,
    newPresetLabel
  } from "$lib/client/products/pointron/focus/session.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import PresetItem from "./PresetItem.svelte";
</script>

<PresetItem
  preset={{ ...$activeSession.composition }}
  isExpandedVariant={true}
/>
<TextInput
  bind:value={$newPresetLabel}
  placeholder="Preset name or leave empty"
  label={{ label: "Preset name", orientation: Orientation.Vertical }}
/>
<!-- TODO - ability to add goals -->
