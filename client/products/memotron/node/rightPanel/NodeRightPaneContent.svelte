<script lang="ts">
  import TableOfContents from "@21n/components/markdown/TableOfContents.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import { properCase } from "@21n/shared-utils/text.utils";
  import NodeHistoryPane from "@21n/products/memotron/common/history/NodeHistoryPane.svelte";
  import NodeLinksPane from "@21n/products/memotron/node/links/NodeLinksPane.svelte";
  import type { IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import { ResourcePanelType } from "@21n/components/resource/resourcePanel.type";
  import NodeTracesPane from "@21n/products/memotron/node/traces/NodeTracesPane.svelte";
  import NodeSidenotesPane from "@21n/products/memotron/node/rightPanel/NodeSidenotesPane.svelte";
  import PropertiesPane from "@21n/components/collection/properties/PropertiesPane.svelte";
  import NodeMetadataPane from "@21n/products/memotron/node/metadata/NodeMetadataPane.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  export let node: IActiveNodeStore;
  export let mdId: string | undefined = undefined;
  export let renderingDetails: any = undefined;
</script>

<div
  class="flex flex-col h-full w-full overflow-y-auto items-start gap-3 cw:py-4 cw:px-0 p-4"
>
  <div class="w-full flex items-center justify-between gap-2">
    <Text
      content={properCase($node.panel)}
      style={TextStyle.PANEL_HEADING_SMALL}
    />
    <Button
      icon="x-circle"
      tooltip="Close"
      on:click={() => {
        node.switchPanel($node.defaultPanel);
      }}
    />
  </div>
  {#if $node.panel === ResourcePanelType.OUTLINE && mdId}
    <TableOfContents {mdId} />
  {:else if $node.panel === ResourcePanelType.LINKS}
    <NodeLinksPane {node} />
  {:else if $node.panel === ResourcePanelType.PROPERTIES}
    <PropertiesPane item={node} resource={Resource.node} />
  {:else if $node.panel === ResourcePanelType.BOOKMARKS}
    <NodeTracesPane {node} />
  {:else if $node.panel === ResourcePanelType.ACTIVITY}
    <NodeHistoryPane {node} />
  {:else if $node.panel === ResourcePanelType.SIDENOTES}
    <NodeSidenotesPane {node} />
  {:else if $node.panel === ResourcePanelType.METADATA}
    <NodeMetadataPane {node} {renderingDetails} />
  {/if}
</div>
