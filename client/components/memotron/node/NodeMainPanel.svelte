<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { isInEditMode, userPreferences } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { InfoTextType } from "$lib/client/types/text.type";
  import { formatDate, formatDatetime } from "$lib/client/utils/time.utils";
  import ResourceStatusBanner from "../common/ResourceStatusBanner.svelte";
  import NodeContent from "./NodeContent.svelte";
  import NodePropertiesOnMainPanel from "./NodePropertiesOnMainPanel.svelte";
  import { resolveActiveNodeStore } from "./node.store";
  export let id: string;
  export let mdId: string;
  const node = resolveActiveNodeStore(id);
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
  {#if $node.type && $node.properties && $node.properties.length > 0}
    <div class="px-2">
      <NodePropertiesOnMainPanel {id} />
    </div>
  {/if}
  <NodeContent {id} {mdId} />
</div>
