<script lang="ts">
  import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
  import { nodeStore, type IActiveNodeStore } from "../node.store";
  import NodeRightPane from "../rightPanel/NodeRightPane.svelte";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import NodeFloatingBar from "../floatingBar/NodeFloatingBar.svelte";
  import NodeTitleBreadcrumbs from "../title/NodeTitleBreadcrumbs.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import NodeContent from "../content/NodeContent.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import ResourceStatusBanner from "../../common/ResourceStatusBanner.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeAvatar from "../avatar/NodeAvatar.svelte";
  import { fade } from "svelte/transition";
  import CollectionsLane from "../floatingBar/CollectionsLane.svelte";
  import { headingNodeTypes, NodeRightPaneType, NodeView } from "../node.type";
  import NodePropertiesPane from "../rightPanel/NodePropertiesPane.svelte";
  import view from "$lib/client/stores/view.store";
  import NodeRightPaneContent from "../rightPanel/NodeRightPaneContent.svelte";
  import NodeBirdView from "../birdView/NodeBirdView.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { resizeListener } from "$lib/client/actions/resize.action";
  import FullScreenCloseButton from "$lib/client/elements/button/FullScreenCloseButton.svelte";
  import { getMdStore } from "$lib/client/components/markdown/markdown.store";
  import TableOfContents from "$lib/client/components/markdown/TableOfContents.svelte";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";

  export let node: IActiveNodeStore;
  export let selectedView: NodeView = NodeView.CONTENT;
  let lastScrollTop = 0;
  let mdId = generateSimpleRandomId();
  let isStickied = false;
  let isShowFloatingBar = true;
  let isRightPanelCollapsed: boolean = true;
  let rightPane = NodeRightPaneType.NONE;
  let floatingBarRef: NodeFloatingBar | undefined = undefined;
  let containerWidth = 0;
  let refreshId: number = new Date().getTime();
  let scrollTimeout: NodeJS.Timeout;
  $: mdStore = getMdStore(mdId);
  $: isWidened = $node.config?.isWidened ?? false;
  $: isConstrainedWidth =
    $view.isConstrainedWidth ||
    containerWidth < 1000 ||
    $node.accessMode === ResourceAccessMode.SPLIT ||
    $node.accessMode === ResourceAccessMode.FSPLIT;

  $: isReadOnlyMode =
    $node.isInReadOnlyMode ||
    $node.isLocked ||
    $node.isArchived ||
    $node.trashInformation !== undefined;

  function onScroll(e: any) {
    const st = e.target?.scrollTop;
    if (st === 0 || st < 50) {
      isShowFloatingBar = true;
    } else if (st > lastScrollTop) {
      isShowFloatingBar = false;
    } else if (st < lastScrollTop) {
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

    const headingElements = document.querySelectorAll("[data-type*='HEADING']");
    const visibleHeadings = Array.from(headingElements).filter((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <=
          (window.innerWidth || document.documentElement.clientWidth)
      );
    });
    $mdStore.headingsInView = visibleHeadings.map((x) => x.id);
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
                class="relative flex flex-col gap-6 mo:pr-0 h-full w-full overflow-auto"
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
                    {#if !isReadOnlyMode}
                      <TextInput
                        id={`title-${$node.id}`}
                        size={Size.xl}
                        bind:value={$node.label}
                        isExperimentalMdInput={true}
                        style={InputStyle.PLAIN}
                        placeholder="Node title"
                        width="w-full"
                        on:change={onLabelChange}
                        on:keydown={(e) => {
                          const event = e.detail;
                          if (event.key === "ArrowDown") {
                            event.preventDefault();
                            if ($mdStore.blocks[0].id)
                              mdStore.focus.set({
                                id: $mdStore.blocks[0].id
                              });
                          }
                        }}
                      />
                    {:else}
                      {$node.label ?? $node.body ?? ""}
                    {/if}
                  </span>
                  <div class="w-full flex mo:px-0 cw:px-0 px-12 -mt-4">
                    <CollectionsLane {node} {isReadOnlyMode} />
                  </div>
                {/if}
                <div class="pl-12">
                  <ResourceStatusBanner resource={node} />
                </div>
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
                <NodeContent {node} {mdId} {isReadOnlyMode} />
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

          {#if !isConstrainedWidth && !$node.isInFocusMode}
            <NodeRightPane
              {node}
              {mdId}
              bind:isRightPanelCollapsed
              bind:pane={rightPane}
              on:close={closeRightPane}
            />
          {:else if $node.isInFocusMode}
            <div class="flex">
              <TableOfContents {mdId} />
            </div>
          {/if}
        </div>
      {/key}
    {:else}
      <NodeBirdView {node} bind:rightPane />
    {/if}
    {#if (isShowFloatingBar || isConstrainedWidth) && !$node.isInFocusMode}
      <div transition:fade={{ duration: 200 }}>
        <BottomFloat margin={isConstrainedWidth ? "mb-4" : "mb-0"}>
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
    {#if $node.isInFocusMode}
      <BottomFloat margin="mb-4">
        <button
          class="flex justify-center items-center gap-2 bg-bgs2 border border-brs3 rounded-md px-4 py-2 shadow-sm hover:bg-bgs3"
          on:click={() => {
            nodeStore.toggleFocusMode($node.id, false);
          }}
        >
          <Icon icon="ph:x" />
          <span class="text-b2"> Close focus mode </span>
        </button>
      </BottomFloat>
    {/if}
  {:else}
    <div class="w-full h-full pt-4 px-20">
      <NodeLoadingPulse />
    </div>
  {/if}
  {#if ($view.isConstrainedWidth || $node.accessMode === ResourceAccessMode.SPLIT || $node.accessMode === ResourceAccessMode.FSPLIT) && (!rightPane || rightPane === NodeRightPaneType.NONE)}
    <FullScreenCloseButton accessMode={$node.accessMode} isFloat={true} />
  {/if}
</div>
