<script lang="ts">
  import { newPresetLabel } from "$lib/client/components/pointron/focus/session.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
</script>

<TextInput
  bind:value={$newPresetLabel}
  placeholder="Preset name or leave empty"
  label={{ label: "Preset name" }}
/>
