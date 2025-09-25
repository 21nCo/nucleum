<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import NodeContent from "$lib/client/products/memotron/node/content/NodeContent.svelte";
  import {
    ActiveNodeStore,
    nodeStore,
    type IActiveNodeStore
  } from "$lib/client/products/memotron/node/node.store";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import type { TimeScaleUnit } from "$lib/client/types/time.type";
  import { setContext } from "svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "../../flux/resourceStores/resource.type";
  import { resolveCalendarNotesId } from "../calendar.utils";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import { preferences } from "$lib/client/stores/preferences/preferences.store";
  import { ActiveCaptureStore } from "$lib/client/products/memotron/capture/capture.store";
  import { Preference } from "$lib/client/stores/preferences/preferences.type";
  import type { IMarkdownTemplate } from "$lib/client/components/markdown/md.type";
  import SyncStatusListener from "$lib/client/elements/listeners/SyncStatusListener.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { Size } from "$lib/client/types/size.enum";
  export let date: Date;
  export let scale: TimeScaleUnit;
  export let mdId: string;
  let node: IActiveNodeStore;
  const captureStore = ActiveCaptureStore.resolve(mdId);
  let isSyncing: boolean = false;

  async function initialize(scaleParam: TimeScaleUnit) {
    if (isSyncing) return;
    const id = resolveCalendarNotesId(date, scaleParam);
    const result = await nodeStore.select(id);
    const savedTemplate = preferences.resolve(Preference.NOTES_TEMPLATE, {
      subVariables: [scaleParam]
    });
    if (!result?.id) {
      if (isSyncing) return;
      await captureStore.saveCalendarNotes({
        date,
        scale: scaleParam,
        template: savedTemplate as IMarkdownTemplate | undefined
      });
    }
    node = ActiveNodeStore.resolve(id);
    const nodeInitResult = await node.init({
      accessMode: ResourceAccessMode.INLINE,
      accessPoint: ResourceAccessPoint.CALENDAR
    });
    if (nodeInitResult?.error) {
      throw new Error(nodeInitResult.error);
    }
    nodeContext.id = id;
  }

  const nodeContext = {
    id: $node?.id,
    contentType: NodeType.NODULAR_MARKDOWN
  };

  setContext("node", nodeContext);
</script>

<SyncStatusListener resource={Resource.everything} bind:isSyncing />
{#if isSyncing}
  <EmptyStatusView
    size={Size.sm}
    mainText="Temporarily unavailable."
    subText={"Calendar notes are not available while sync is in progress."}
  />
{:else}
  {#await initialize(scale)}
    <div class="flex items-center justify-center h-full mo:px-0 px-10 pt-6">
      <EmptyStatusView
        isLoadingState={true}
        loadingAnimation={LoadingAnimationType.PAGE_PULSE}
      />
    </div>
  {:then _}
    <div class="flex w-full h-full overflow-y-auto">
      <NodeContent {node} {mdId} />
    </div>
  {:catch err}
    <EmptyStatusView
      mainText="Error loading calendar notes. Please try again after some time."
      subText="Something went wrong."
    />
  {/await}
{/if}

<ComponentBaseLayer hasDragAndDrop={true} />
