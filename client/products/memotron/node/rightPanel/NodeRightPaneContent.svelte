<script lang="ts">
  import TableOfContents from "$lib/client/components/markdown/TableOfContents.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { properCase } from "$lib/shared/utils/text.utils";
  import NodeHistoryPane from "../../common/history/NodeHistoryPane.svelte";
  import NodeLinksPane from "../links/NodeLinksPane.svelte";
  import type { IActiveNodeStore } from "../node.store";
  import { NodeRightPaneType } from "../node.type";
  import NodeTracesPane from "../traces/NodeTracesPane.svelte";
  import NodeSidenotesPane from "./NodeSidenotesPane.svelte";
  import NodePropertiesPane from "./NodePropertiesPane.svelte";
  export let pane: NodeRightPaneType;
  export let node: IActiveNodeStore;
  export let mdId: string | undefined = undefined;
  export let renderingDetails: any = undefined;
</script>

<div class="flex flex-col h-full w-full overflow-y-auto items-start gap-3 p-4">
  <Text content={properCase(pane)} style={TextStyle.PANEL_HEADING_SMALL} />
  {#if pane === NodeRightPaneType.OUTLINE && mdId}
    <TableOfContents {mdId} />
  {:else if pane === NodeRightPaneType.LINKS}
    <NodeLinksPane {node} />
  {:else if pane === NodeRightPaneType.PROPERTIES}
    <NodePropertiesPane {node} {renderingDetails} />
  {:else if pane === NodeRightPaneType.TRACES}
    <NodeTracesPane {node} />
  {:else if pane === NodeRightPaneType.HISTORY}
    <NodeHistoryPane />
  {:else if pane === NodeRightPaneType.SIDENOTES}
    <NodeSidenotesPane {node} />
  {/if}
</div>
