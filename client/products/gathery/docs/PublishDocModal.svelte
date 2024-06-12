<script lang="ts">
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import CopyableText from "$lib/client/elements/text/CopyableText.svelte";
  import { spaceInContext } from "$lib/client/products/gathery/space.store";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { stripTablePrefix } from "$lib/client/utils/text.utils";
  export let id: string;
  let docSlug = stripTablePrefix(id);
  let selected = "Access from web";
</script>

<PanelSwitcher
  items={["Access from web", "Use in code"]}
  bind:value={selected}
  style={PanelSwitcherStyle.BAR}
/>
{#if selected === "Access from web"}
  <CopyableText
    parentBackgroundIndex={1}
    text={(window.location.host ?? "") +
      "/d/" +
      ($spaceInContext.slug ?? "space") +
      "/" +
      docSlug}
    label="Document URL"
  />
{:else}
  <div class="flex flex-col items-start w-full gap-4">
    <span class="text-fgs2 text-b2">
      Use the below params after installing Gathery package.
    </span>
    <CopyableText text={$spaceInContext.id} label="Space ID" />
    <CopyableText text={docSlug} label="Document ID" />
  </div>
{/if}
