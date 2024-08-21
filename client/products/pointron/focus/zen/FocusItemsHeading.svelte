<script lang="ts">
  import EditToggleButton from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { isInEditMode } from "$lib/client/stores/app.store";
</script>

<div class="flex flex-col w-full items-center gap-2">
  <div class="flex w-full justify-between">
    <Text style={TextStyle.PANEL_HEADING_SMALL} content="Focus Items" />
    <EditToggleButton />
  </div>
  <div class="flex flex-col items-center gap-1 text-fgs3">
    {#if $isInEditMode}
      <span class="text-b3">Edit mode is on.</span>
      <span class="text-b4"
        >Turn off edit mode to start tasks or switch between them.</span
      >
    {:else}
      <span class="text-b3"> Tap on a task/goal to start or stop it. </span>
    {/if}
  </div>
</div>
