<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import type { IActiveNodeStore } from "../node.store";
  import { NodeRightPaneType } from "../node.type";
  import NodeRightPaneContent from "./NodeRightPaneContent.svelte";
  export let node: IActiveNodeStore;
  export let pane: NodeRightPaneType | undefined = undefined;
  export let renderingDetails: any = undefined;
</script>

<aside
  class="flex flex-col h-full gap-4 justify-center items-center w-3/10 w--80 2k:w--96"
>
  {#if pane}
    <NodeRightPaneContent {node} {pane} {renderingDetails} />
  {:else}
    <div>
      <button
        class="flex gap-2 items-center rounded-full border border-brs3 px-4 py-2 hover:bg-bgs2"
      >
        <Icon icon="bookmark" />
        <span> Highlights </span>
        <span
          class="bg-bgs2 border border-brs2 w-4 h-4 rounded-md text-b4 text-fgs3"
        >
          {$node.clips?.length}
        </span>
      </button>
    </div>
    <div class="text-b3 text-fgs3 mt-2">
      Clipped at {formatDatetime($userPreferences, $node.createdAt)}
    </div>
  {/if}
</aside>
