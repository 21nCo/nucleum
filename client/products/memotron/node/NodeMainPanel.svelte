<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import ResourceStatusBanner from "../common/ResourceStatusBanner.svelte";
  import NodeContent from "./NodeContent.svelte";
  import NodePropertiesOnMainPanel from "./NodePropertiesOnMainPanel.svelte";
  import type { IActiveNodeStore } from "./node.store";
  export let node: IActiveNodeStore;
  export let mdId: string;
  $: console.log({ node: $node });
</script>

<div class="flex flex-col gap-6 h-full grow">
  {#if !$isInEditMode}
    <div
      class="flex justify-center gap-2 border-2 border-dotted border-brs3 rounded-md p-2 text-b2 mx-10"
    >
      <Icon icon="book-open" size={Size.sm} />
      <span>Read mode</span>
      <button
        class="text-b4 font-medium underline"
        on:click={() => {
          $isInEditMode = true;
        }}>turn off</button
      >
    </div>
  {/if}
  <ResourceStatusBanner resource={node} />
  {#if $node.types && $node.types.length > 0 && !$node.focusedBlock}
    <!-- TODO - later - show properties of focused node if the focused blocks is associated with a type collection -->
    <div class="px-2">
      <NodePropertiesOnMainPanel {node} />
    </div>
  {/if}
  <NodeContent {node} {mdId} />
</div>
