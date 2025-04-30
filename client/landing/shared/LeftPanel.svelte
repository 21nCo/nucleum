<script lang="ts">
  import { addAnimateClass } from "$lib/client/utils/ui.utils";
  import { PanelName } from "./landing.type";
  import PanelButton from "./elements/PanelButton.svelte";
  import { companyWebsite } from "$lib/client/landing/shared/store/shared.store";
  export let isProduct: boolean = false;
  const id: string = "left-panel";
</script>

<PanelButton
  {id}
  label="21n"
  description="Built at 21n"
  {isProduct}
  icon="long-arrow-left"
  on:click={async () => {
    if (!isProduct) return;
    await addAnimateClass("animate-bounce-l", id);
    window.location.href = companyWebsite;
  }}
/>
