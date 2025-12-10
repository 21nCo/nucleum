<script lang="ts">
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import NodeContent from "@21n/products/memotron/node/content/NodeContent.svelte";
  import {
    ActiveNodeStore,
    nodeStore,
    type IActiveNodeStore
  } from "@21n/products/memotron/node/node.store";
  import { NodeType } from "@21n/products/memotron/node/node.type";
  import type { TimeScaleUnit } from "@21n/types/time.type";
  import { setContext } from "svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import { resolveCalendarNotesId } from "@21n/components/calendar/calendar.utils";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import { preferences } from "@21n/stores/preferences/preferences.store";
  import { ActiveCaptureStore } from "@21n/products/memotron/capture/capture.store";
  import { Preference } from "@21n/stores/preferences/preferences.type";
  import type { IMarkdownTemplate } from "@21n/components/markdown/md.type";
  import SyncStatusListener from "@21n/elements/listeners/SyncStatusListener.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { Size } from "@21n/types/size.enum";
  import { page } from "$app/stores";
  import { Context } from "@21n/types/appStore.type";

  export let date: Date;
  export let scale: TimeScaleUnit;
  export let mdId: string;
  let node: IActiveNodeStore;
  const captureStore = ActiveCaptureStore.resolve(mdId);
  let isSyncing: boolean = false;
  let isFullScreenActive: boolean = false;

  $: {
    const fullScreenParam = $page.url.searchParams.get(ResourceAccessMode.FULL);
    const nodeId = resolveCalendarNotesId(date, scale);
    isFullScreenActive = fullScreenParam === nodeId;
  }

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

  setContext(Context.NODE, nodeContext);
</script>

<SyncStatusListener resource={Resource.everything} bind:isSyncing />
{#if isSyncing || isFullScreenActive}
  <EmptyStatusView
    size={Size.sm}
    mainText="Temporarily unavailable."
    subText={
      isSyncing
        ? "Calendar notes are not available while sync is in progress."
        : "Calendar notes are hidden while full screen mode is active."
    }
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
