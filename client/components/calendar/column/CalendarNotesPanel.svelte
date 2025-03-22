<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import NodeContent from "$lib/client/products/memotron/node/content/NodeContent.svelte";
  import {
    ActiveNodeStore,
    nodeStore,
    type IActiveNodeStore
  } from "$lib/client/products/memotron/node/node.store";
  import {
    NodeMetaType,
    NodeType
  } from "$lib/client/products/memotron/node/node.type";
  import type { TimeScaleUnit } from "$lib/client/types/time.type";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { ResourceAccessMode } from "../../flux/resourceStores/resource.type";
  import { resolveCalendarNotesId } from "../calendar.utils";

  export let date: Date;
  export let scale: TimeScaleUnit;
  let mdId = generateSimpleRandomId();
  let isLoading = true;
  let node: IActiveNodeStore;

  async function initialize() {
    const id = resolveCalendarNotesId(date, scale);
    const result = await nodeStore.select(id);
    if (!result?.id) {
      const creationResult = await nodeStore.create([
        {
          id,
          contentType: NodeType.NODULAR_MARKDOWN,
          label: "Calendar Notes - " + formatDate(date, scale),
          body: "",
          metaType: NodeMetaType.CALENDAR_NOTES,
          children: []
        }
      ]);
    }
    node = ActiveNodeStore.resolve(id);
    await node.init(ResourceAccessMode.INLINE);
    isLoading = false;
  }

  function formatDate(date: Date, scale: TimeScaleUnit) {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  initialize();
</script>

{#if isLoading}
  <EmptyStatusView isLoadingState={true} />
{:else}
  <NodeContent {node} {mdId} />
{/if}
