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
  import { setContext } from "svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "../../flux/resourceStores/resource.type";
  import { resolveCalendarNotesId } from "../calendar.utils";
  import { getUtcSafeDay } from "$lib/client/elements/datetime/datetime.utils";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";

  export let date: Date;
  export let scale: TimeScaleUnit;
  let mdId = generateSimpleRandomId();
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
          date: getUtcSafeDay(date),
          children: []
        }
      ]);
    }
    node = ActiveNodeStore.resolve(id);
    await node.init({
      accessMode: ResourceAccessMode.INLINE,
      accessPoint: ResourceAccessPoint.CALENDAR
    });
    nodeContext.id = id;
  }

  const nodeContext = {
    id: $node?.id,
    contentType: NodeType.NODULAR_MARKDOWN
  };

  setContext("node", nodeContext);

  function formatDate(date: Date, scale: TimeScaleUnit) {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }
</script>

{#await initialize()}
  <div class="flex items-center justify-center h-full mo:px-0 px-10 pt-6">
    <EmptyStatusView
      isLoadingState={true}
      loadingAnimation={LoadingAnimationType.PAGE_PULSE}
    />
  </div>
{:then _}
  <NodeContent {node} {mdId} />
{:catch _}
  <EmptyStatusView mainText="Error loading calendar notes" />
{/await}

<ComponentBaseLayer hasDragAndDrop={true} />
