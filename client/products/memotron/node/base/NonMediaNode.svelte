<script lang="ts">
  import NodeLoadingPulse from "@21n/elements/feedback/animations/NodeLoadingPulse.svelte";
  import { nodeStore, type IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import NodeRightPane from "@21n/products/memotron/node/rightPanel/NodeRightPane.svelte";
  import BottomFloat from "@21n/elements/BottomFloat.svelte";
  import NodeFloatingBar from "@21n/products/memotron/node/floatingBar/NodeFloatingBar.svelte";
  import NodeTitleBreadcrumbs from "@21n/products/memotron/node/title/NodeTitleBreadcrumbs.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import NodeContent from "@21n/products/memotron/node/content/NodeContent.svelte";
  import { Size } from "@21n/types/size.enum";
  import ResourceStatusBanner from "@21n/components/record/RecordStatusBanner.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { cn } from "@21n/utils/ui.utils";
  import NodeAvatar from "@21n/products/memotron/node/avatar/NodeAvatar.svelte";
  import { fade } from "svelte/transition";
  import CollectionsLane from "@21n/products/memotron/node/floatingBar/CollectionsLane.svelte";
  import { headingNodeTypes, NodeRightPaneType, NodeView } from "@21n/products/memotron/node/node.type";
  import PropertiesPane from "@21n/components/collection/properties/PropertiesPane.svelte";
  import view from "@21n/stores/view.store";
  import NodeRightPaneContent from "@21n/products/memotron/node/rightPanel/NodeRightPaneContent.svelte";
  import NodeBirdView from "@21n/products/memotron/node/birdView/NodeBirdView.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint,
    ResourceActionType
  } from "@21n/components/flux/resourceStores/resource.type";
  import { resizeListener } from "@21n/actions/resize.action";
  import FullScreenCloseButton from "@21n/elements/button/FullScreenCloseButton.svelte";
  import { getMdStore } from "@21n/components/markdown/markdown.store";
  import TableOfContents from "@21n/components/markdown/TableOfContents.svelte";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  import context from "@21n/stores/context.store";
  import { Embed } from "@21n/types/context.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { dispatchCustomEvent } from "@21n/utils/browser.utils";
  import { GlobalEvent } from "@21n/types/event.enum";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { appStore } from "@21n/stores/app.store";

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
  async function onLabelChange(e: any) {
    if ($node.label) await node.modify({ label: $node.label });
  }

  function closeRightPane() {
    rightPane = NodeRightPaneType.NONE;
    isRightPanelCollapsed = true;
    onRightPaneSwitch();
  }

  function _openRightPane(pane: NodeRightPaneType) {
    rightPane = pane;
    isRightPanelCollapsed = false;
    onRightPaneSwitch();
  }

  function onRightPaneSwitch() {
    if ($node.accessMode !== ResourceAccessMode.INLINE) return;
    if (isRightPanelCollapsed) {
      dispatchCustomEvent(GlobalEvent.EXPAND_PANEL, {});
    } else {
      dispatchCustomEvent(GlobalEvent.COLLAPSE_PANEL, {});
    }
  }

  function openRightPane(e: CustomEvent<NodeRightPaneType>) {
    _openRightPane(e.detail);
  }

  async function onViewSwitch(e: CustomEvent<NodeView>) {
    selectedView = e.detail;
    appStore.toggleSearchParamRecordSpecific($node.id, {
      [AppSearchParam.NODE_VIEW]: selectedView
    });
    if (selectedView === NodeView.CONTENT) {
      await node.init({
        accessMode: $node.accessMode,
        accessPoint: ResourceAccessPoint.SELF
      });
      refreshId = new Date().getTime();
      await node.afterInit();
    }
  }
</script>

<div
  class="relative w-full h-full flex flex-col bg-bgs1 rounded-md"
  id="mdcontainer-{mdId}"
  use:resizeListener={(e) => {
    containerWidth = e.width;
  }}
>
  {#if $node}
    {#if selectedView === NodeView.CONTENT}
      {#key refreshId}
        <div
          class={cn("h-full w-full mo:gap-0 cw:gap-0 gap-4 otop:pt-12", {
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
                "dp:min-w-[50rem]": !isWidened && !isConstrainedWidth
              })}
            >
              {#if headingNodeTypes.includes($node.contentType)}
                {#key $node.mdParent?.map((x) => x.toString())?.join(".")}
                  <header class="flex w-full px-12 py-4">
                    <NodeTitleBreadcrumbs
                      id={$node.id}
                      mdParent={$node.mdParent}
                      currentLabel={$node.label}
                      on:click={(e) => {
                        node.eventStore.set({
                          event: e.detail.event,
                          id: e.detail.item.resourceId
                        });
                      }}
                    />
                  </header>
                {/key}
              {/if}
              <main
                class="relative flex flex-col gap-6 mo:pr-0 h-full w-full overflow-auto"
                on:scroll={onScroll}
              >
                {#if !$node.focusedBlock}
                  <div class="min-h-20" />
                  {#if $node.types && $node.types.length > 0}
                    <span
                      class={cn("flex mo:mx-0 mx-12 -mb-6", {
                        "opacity-0": isStickied,
                        "opacity-100": !isStickied
                      })}
                    >
                      <NodeAvatar
                        node={$node}
                        accessPoint={ResourceAccessPoint.SELF}
                        isExpandedContext={true}
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
                    {#if isStickied && $node.types && $node.types.length > 0}
                      <NodeAvatar
                        node={$node}
                        accessPoint={ResourceAccessPoint.SELF}
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
                        on:debouncedChange={onLabelChange}
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
                <div class="cw:px-0 px-12">
                  <ResourceStatusBanner resource={node} />
                </div>
                {#if $node.types && $node.types.length > 0 && !$node.focusedBlock}
                  <!-- TODO - later - show properties of focused node if the focused blocks is associated with a type collection -->
                  <PropertiesPane
                    item={node}
                    resource={Resource.node}
                    isVisibleProps={true}
                    on:showAll={() => {
                      _openRightPane(NodeRightPaneType.PROPERTIES);
                    }}
                  />
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
              on:switch={onRightPaneSwitch}
            />
          {:else if $node.isInFocusMode && !isConstrainedWidth}
            <div class="flex max-w-sm">
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
        <BottomFloat
          margin={isConstrainedWidth && $context.embed === Embed.HANDSET
            ? "mb-8"
            : isConstrainedWidth
              ? "mb-4"
              : "mb-0"}
        >
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
              } else if (e.detail === ResourceActionType.TOGGLE_READ_MODE) {
                nodeStore.toggleReadMode($node.id, false);
              }
            }}
          />
        </BottomFloat>
      </div>
    {/if}
    {#if $node.isInFocusMode}
      <BottomFloat margin={$context.embed === Embed.HANDSET ? "mb-8" : "mb-4"}>
        <button
          class="flex justify-center items-center gap-2 bg-bgs2 border border-brs3 rounded-md px-4 py-2 shadow-sm hover:bg-bgs3"
          on:click={() => {
            nodeStore.toggleFocusMode($node.id, false);
          }}
        >
          <Icon icon="cross" />
          <span class="text-b2"> Close focus mode </span>
        </button>
      </BottomFloat>
    {/if}
  {:else}
    <div class="w-full h-full pt-4 px-20 otop:pt-12">
      <NodeLoadingPulse />
    </div>
  {/if}
  {#if ($node.accessMode === ResourceAccessMode.SPLIT || $node.accessMode === ResourceAccessMode.FSPLIT) && (!rightPane || rightPane === NodeRightPaneType.NONE)}
    <FullScreenCloseButton accessMode={$node.accessMode} isFloat={true} />
  {/if}
</div>
