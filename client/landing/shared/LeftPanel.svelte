<script lang="ts">
  import { addAnimateClass } from "$lib/client/utils/ui.utils";
  import { PanelName } from "./Landing.types";
  import PanelButton from "./elements/PanelButton.svelte";
  export let isProduct: boolean = false;
  const id: string = "left-panel";
</script>

<PanelButton
  {id}
  label={PanelName.BUILT_AT_BLANK_COOP}
  {isProduct}
  icon="long-arrow-left"
  on:click={async () => {
    if (!isProduct) return;
    console.log({ at: "leftpanel click", isProduct });
    await addAnimateClass("animate-bounce-l", id);
    window.location.href = "https://21n.org/";
  }}
/>
