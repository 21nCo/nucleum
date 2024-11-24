<script lang="ts">
  import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
  import { nodeStore, type IActiveNodeStore } from "../node.store";
  import NodeRightPane from "../rightPanel/NodeRightPane.svelte";
  import { generateUID } from "$lib/client/utils/utils";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import NodeFloatingBar from "../floatingBar/NodeFloatingBar.svelte";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import NodeTitleBreadcrumbs from "../title/NodeTitleBreadcrumbs.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import NodeContent from "../content/NodeContent.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import ResourceStatusBanner from "../../common/ResourceStatusBanner.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeAvatar from "../avatar/NodeAvatar.svelte";
  import { fade, slide } from "svelte/transition";
  import CollectionsLane from "../floatingBar/CollectionsLane.svelte";
  import { headingNodeTypes, NodeRightPaneType, NodeView } from "../node.type";
  import NodePropertiesPane from "../rightPanel/NodePropertiesPane.svelte";
  import view from "$lib/client/stores/view.store";
  import NodeRightPaneContent from "../rightPanel/NodeRightPaneContent.svelte";
  import NodeGraph from "../../graph/NodeGraph.svelte";
  import NodeBirdView from "../birdView/NodeBirdView.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { resizeListener } from "$lib/client/actions/resize.action";

  export let node: IActiveNodeStore;
  export let selectedView: NodeView = NodeView.CONTENT;
  let lastScrollTop = 0;
  let scrollDirection = "none";
  let mdId = generateUID();
  let isStickied = false;
  let isShowFloatingBar = true;
  let isWidened = false;
  let isRightPanelCollapsed: boolean = true;
  let rightPane = NodeRightPaneType.NONE;
  let floatingBarRef: NodeFloatingBar | undefined = undefined;
  let containerWidth = 0;
  let refreshId: number = new Date().getTime();
  let scrollTimeout: NodeJS.Timeout;

  $: isConstrainedWidth =
    $view.isConstrainedWidth ||
    containerWidth < 1000 ||
    $node.accessMode === ResourceAccessMode.SPLIT ||
    $node.accessMode === ResourceAccessMode.FSPLIT;

  function onScroll(e: any) {
    const st = event?.target?.scrollTop;
    if (st > lastScrollTop) {
      scrollDirection = "down";
      isShowFloatingBar = false;
    } else if (st < lastScrollTop) {
      scrollDirection = "up";
      isShowFloatingBar = true;
    }
    lastScrollTop = st;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const elementTarget = document.querySelector(".node-title.sticky");
      const rect = elementTarget?.getBoundingClientRect();
      if (!rect) return;
      const currentlyStickied = isStickied;
      const shouldBeStickied = currentlyStickied
        ? rect.top <= 85
        : rect.top <= 50;
      if (currentlyStickied !== shouldBeStickied) {
        isStickied = shouldBeStickied;
      }
    }, 10);
  }
  function onLabelChange(e: any) {
    // console.log("onLabelChange", e);
    if ($node.label) node.debouncedModify({ label: $node.label });
  }

  function closeRightPane() {
    rightPane = NodeRightPaneType.NONE;
    isRightPanelCollapsed = true;
  }

  function openRightPane(e: CustomEvent<NodeRightPaneType>) {
    rightPane = e.detail;
    isRightPanelCollapsed = false;
  }
  async function onViewSwitch(e: CustomEvent<NodeView>) {
    selectedView = e.detail;
    if (selectedView === NodeView.CONTENT) {
      await node.init($node.accessMode);
      refreshId = new Date().getTime();
    }
  }
</script>

<div
  class="relative w-full h-full flex flex-col bg-bgs1 rounded-md"
  use:resizeListener={(e) => {
    containerWidth = e.width;
  }}
>
  {#if $node}
    {#if selectedView === NodeView.CONTENT}
      {#key refreshId}
        <div
          class={cn("h-full w-full mo:gap-0 cw:gap-0 gap-4", {
            "flex px-4 justify-center": !isWidened,
            "dp:grid dp:grid-cols-[1fr_auto_1fr] dp:gap-2":
              !isWidened && !isConstrainedWidth,
            "flex px-4": isWidened,
            "px-0": isConstrainedWidth && rightPane !== NodeRightPaneType.NONE
          })}
        >
          {#if !isConstrainedWidth || (isConstrainedWidth && rightPane === NodeRightPaneType.NONE)}
            <div class="min-w-0" />
            <div
              class={cn("flex flex-col justify-center items-center h-full", {
                "flex-grow": isWidened,
                "flex-grow max-w-[50rem] overflow-auto": !isWidened,
                "dp:min-w-[50rem]":
                  !isWidened &&
                  $node.accessMode !== ResourceAccessMode.SPLIT &&
                  $node.accessMode !== ResourceAccessMode.FSPLIT
              })}
            >
              {#if headingNodeTypes.includes($node.contentType)}
                <!-- {#key $node.mdParent.map((x) => x.toString()).join(".")} -->
                <header class="flex w-full px-12 py-4">
                  <NodeTitleBreadcrumbs
                    id={$node.id}
                    currentLabel={$node.label}
                    on:click={(e) => {
                      node.eventStore.set({
                        event: e.detail.event,
                        id: e.detail.item.resourceId
                      });
                    }}
                  />
                </header>
                <!-- {/key} -->
              {/if}
              <main
                class="relative flex flex-col gap-6 mo:pr-0 pr-6 h-full w-full overflow-auto"
                on:scroll={onScroll}
              >
                {#if !$node.focusedBlock}
                  <div class="min-h-20" />
                  {#if $node.types}
                    <span
                      class={cn("flex mo:mx-0 mx-12 -mb-6", {
                        "opacity-0": isStickied,
                        "opacity-100": !isStickied
                      })}
                    >
                      <NodeAvatar
                        types={$node.types}
                        accessPoint={ResourceAccessPoint.SELF}
                        size={40}
                      />
                    </span>
                  {/if}
                  <span
                    class={cn(
                      "node-title flex gap-3 font-medium text-start sticky top-0 z-10 mo:ml-0 cw:ml-0 ml-12 py-3 userdata",
                      {
                        "text-h4 bg-bgs1": isStickied,
                        "text-h2 bg-bgs1": !isStickied
                      }
                    )}
                  >
                    {#if isStickied && $node.types}
                      <NodeAvatar
                        types={$node.types}
                        accessPoint={ResourceAccessPoint.SELF}
                        size={Size.sm}
                      />
                    {/if}
                    <!-- {#if $isInEditMode} -->
                    <TextInput
                      size={Size.xl}
                      bind:value={$node.label}
                      isExperimentalMdInput={true}
                      style={InputStyle.PLAIN}
                      placeholder="Node title"
                      width="w-full"
                      on:change={onLabelChange}
                    />
                    <!-- {:else}
                    {$node.label ?? $node.body ?? ""}
                  {/if} -->
                  </span>
                  <div class="w-full flex mo:px-0 cw:px-0 px-12 -mt-4">
                    <CollectionsLane {node} />
                  </div>
                {/if}
                <ResourceStatusBanner resource={node} />
                {#if $node.types && $node.types.length > 0 && !$node.focusedBlock}
                  <!-- TODO - later - show properties of focused node if the focused blocks is associated with a type collection -->
                  <div class="mo:px-0 px-2">
                    <NodePropertiesPane
                      {node}
                      isVisibleProps={true}
                      on:showAll={() => {
                        console.log("showAll");
                        rightPane = NodeRightPaneType.PROPERTIES;
                        isRightPanelCollapsed = false;
                      }}
                    />
                  </div>
                {/if}
                {#if $node.isInReadMode}
                  <div
                    class="flex justify-center gap-2 bg-bgs2 border-2 border-dotted border-brs3 rounded-md p-2 text-b2 mx-12"
                  >
                    <Icon icon="book-open" size={Size.sm} />
                    <span>Read mode</span>
                    <button
                      class="text-b4 font-medium underline"
                      on:click={() => {
                        nodeStore.toggleReadMode($node.id, false);
                        floatingBarRef?.resetToggle();
                      }}>turn off</button
                    >
                  </div>
                {/if}
                <NodeContent {node} {mdId} />
              </main>
            </div>
          {:else if isConstrainedWidth && rightPane !== NodeRightPaneType.NONE}
            <NodeRightPaneContent
              {node}
              {mdId}
              pane={rightPane}
              on:close={closeRightPane}
            />
          {/if}

          {#if !isConstrainedWidth}
            <NodeRightPane
              {node}
              {mdId}
              bind:isRightPanelCollapsed
              bind:pane={rightPane}
              on:close={closeRightPane}
            />
          {/if}
        </div>
      {/key}
    {:else}
      <NodeBirdView {node} bind:rightPane />
    {/if}
    {#if isShowFloatingBar}
      <div transition:fade={{ duration: 200 }}>
        <BottomFloat margin={isConstrainedWidth ? "mb-8" : "mb-6"}>
          <NodeFloatingBar
            {node}
            {isConstrainedWidth}
            nodeView={selectedView}
            bind:isWidened
            bind:this={floatingBarRef}
            on:action={(e) => {
              if (
                [
                  NodeRightPaneType.METADATA,
                  NodeRightPaneType.HISTORY,
                  NodeRightPaneType.SIDENOTES,
                  NodeRightPaneType.PROPERTIES,
                  NodeRightPaneType.LINKS
                ].includes(e.detail)
              ) {
                openRightPane(e);
              }
            }}
            on:view={onViewSwitch}
            on:panel={openRightPane}
            on:none={(e) => {
              if (e.detail === rightPane) {
                closeRightPane();
              } else if (e.detail === "readMode") {
                nodeStore.toggleReadMode($node.id, false);
              }
            }}
          />
        </BottomFloat>
      </div>
    {/if}
  {:else}
    <div class="w-full h-full pt-4 px-20">
      <NodeLoadingPulse />
    </div>
  {/if}
</div>
