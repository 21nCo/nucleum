<script lang="ts">
  import { addAnimateClass } from "$lib/client/utils/ui.utils";
  import { PanelName } from "./Landing.types";
  import PanelButton from "./elements/PanelButton.svelte";

  const id: string = "left-panel";
</script>

<PanelButton
  {id}
  label={PanelName.BUILT_AT_BLANK_COOP}
  icon="long-arrow-left"
  on:click={async () => {
    await addAnimateClass("animate-bounce-l", id);
    window.location.href = "https://blanklabs.org/";
  }}
/>
