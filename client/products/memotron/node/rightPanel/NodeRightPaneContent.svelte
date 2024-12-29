<script lang="ts">
  import TableOfContents from "$lib/client/components/markdown/TableOfContents.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { properCase } from "$lib/shared/utils/text.utils";
  import NodeHistoryPane from "../../common/history/NodeHistoryPane.svelte";
  import NodeLinksPane from "../links/NodeLinksPane.svelte";
  import type { IActiveNodeStore } from "../node.store";
  import { NodeRightPaneType, NodeType } from "../node.type";
  import NodeTracesPane from "../traces/NodeTracesPane.svelte";
  import NodeSidenotesPane from "./NodeSidenotesPane.svelte";
  import NodePropertiesPane from "./NodePropertiesPane.svelte";
  import NodeMetadataPane from "../metadata/NodeMetadataPane.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let pane: NodeRightPaneType;
  export let node: IActiveNodeStore;
  export let mdId: string | undefined = undefined;
  export let renderingDetails: any = undefined;
  export let isShowClose: boolean = false;
  export let isConstrainedWidth: boolean = false;

  $: _isShowClose =
    isShowClose ||
    pane === NodeRightPaneType.METADATA ||
    isConstrainedWidth ||
    ($node.contentType === NodeType.NODULAR_MARKDOWN &&
      pane === NodeRightPaneType.HISTORY) ||
    ($node.contentType !== NodeType.NODULAR_MARKDOWN &&
      pane === NodeRightPaneType.LINKS);
</script>

<div class="flex flex-col h-full w-full overflow-y-auto items-start gap-3 p-4">
  <div class="w-full flex items-center justify-between gap-2">
    <Text content={properCase(pane)} style={TextStyle.PANEL_HEADING_SMALL} />
    {#if _isShowClose}
      <Button
        icon="ph:x-circle-light"
        tooltip="Close"
        on:click={() => {
          dispatch("close", pane);
        }}
      />
    {/if}
  </div>
  {#if pane === NodeRightPaneType.OUTLINE && mdId}
    <TableOfContents {mdId} />
  {:else if pane === NodeRightPaneType.LINKS}
    <NodeLinksPane {node} />
  {:else if pane === NodeRightPaneType.PROPERTIES}
    <NodePropertiesPane {node} />
  {:else if pane === NodeRightPaneType.TRACES}
    <NodeTracesPane {node} />
  {:else if pane === NodeRightPaneType.HISTORY}
    <NodeHistoryPane {node} />
  {:else if pane === NodeRightPaneType.SIDENOTES}
    <NodeSidenotesPane {node} />
  {:else if pane === NodeRightPaneType.METADATA}
    <NodeMetadataPane {node} {renderingDetails} />
  {/if}
</div>
