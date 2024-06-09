<script lang="ts">
  import { newPresetLabel } from "$lib/client/products/pointron/focus/session.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
</script>

<TextInput
  bind:value={$newPresetLabel}
  placeholder="Preset name or leave empty"
  label={{ label: "Preset name", orientation: Orientation.Vertical }}
/>
