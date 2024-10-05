<script lang="ts">
  import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
  import { type IActiveNodeStore } from "../node.store";
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
  import { NodeRightPaneType } from "../node.type";
  import NodePropertiesPane from "../rightPanel/NodePropertiesPane.svelte";

  export let node: IActiveNodeStore;
  export let selectedView: string = "Content";
  let lastScrollTop = 0;
  let scrollDirection = "none";
  let mdId = generateUID();
  let isStickied = false;
  let isShowFloatingBar = true;
  let isWidened = false;
  let isRightPanelCollapsed: boolean = true;
  let rightPane = NodeRightPaneType.OUTLINE;
  function onScroll(e: any) {
    // console.log("onScroll", e);
    const st = event?.target?.scrollTop;
    if (st > lastScrollTop) {
      scrollDirection = "down";
      isShowFloatingBar = false;
    } else if (st < lastScrollTop) {
      scrollDirection = "up";
      isShowFloatingBar = true;
    }
    lastScrollTop = st;
    var elementTarget = document.querySelector(".node-title.sticky");
    var positionFromTop = elementTarget?.getBoundingClientRect().top;
    isStickied = positionFromTop !== undefined ? positionFromTop <= 50 : false;
    // console.log({ positionFromTop, isStickied, scrollDirection });
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
</script>

<div class="relative w-full h-full flex flex-col bg-bgs1 rounded-md">
  {#if $node}
    {#if selectedView === "Content"}
      <div
        class={cn("h-full w-full gap-4", {
          "grid grid-cols-[1fr_auto_1fr] gap-2": !isWidened,
          "flex px-4": isWidened
        })}
      >
        <div class="min-w-0" />
        <div
          class={cn("flex flex-col justify-center items-center h-full", {
            "flex-grow": isWidened,
            "w-[50rem] overflow-auto": !isWidened
          })}
        >
          {#if $node.mdParent && $node.mdParent.length > 0}
            <header class="flex w-full px-12 py-4">
              {#key $node.mdParent}
                <NodeTitleBreadcrumbs
                  node={$node}
                  on:click={(e) => {
                    node.eventStore.set({
                      event: e.detail.event,
                      id: e.detail.item.resourceId
                    });
                  }}
                />
              {/key}
            </header>
          {/if}
          <main
            class="relative flex flex-col gap-6 pr-6 h-full w-full overflow-auto"
            on:scroll={onScroll}
          >
            <div class="min-h-20" />
            {#if !$node.focusedBlock}
              {#if $node.types}
                <span class="flex mx-12 -mb-8">
                  <NodeAvatar types={$node.types} size={40} />
                </span>
              {/if}
              <span
                class={cn(
                  "node-title flex gap-3 font-medium text-start sticky top-0 z-10 ml-12 py-3",
                  {
                    "text-h4 bg-bgs1": isStickied,
                    "text-h2 bg-bgs1": !isStickied
                  }
                )}
              >
                {#if isStickied && $node.types}
                  <NodeAvatar types={$node.types} size={Size.sm} />
                {/if}
                {#if $isInEditMode}
                  <TextInput
                    size={Size.xl}
                    bind:value={$node.label}
                    style={InputStyle.PLAIN}
                    placeholder="Node title"
                    width="w-full"
                    on:input={onLabelChange}
                  />
                {:else}
                  {$node.label ?? $node.body ?? ""}
                {/if}
              </span>
            {/if}
            <div class="w-full flex px-12 -mt-4">
              <CollectionsLane {node} />
            </div>
            <ResourceStatusBanner resource={node} />
            {#if $node.types && $node.types.length > 0 && !$node.focusedBlock}
              <!-- TODO - later - show properties of focused node if the focused blocks is associated with a type collection -->
              <div class="px-2">
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
            {#if !$isInEditMode}
              <div
                class="flex justify-center gap-2 bg-bgs2 border-2 border-dotted border-brs3 rounded-md p-2 text-b2 mx-12"
              >
                <Icon icon="book-open" size={Size.sm} />
                <span>Read mode</span>
                <button
                  class="text-b4 font-medium underline"
                  on:click={() => {
                    $isInEditMode = true;
                  }}>turn off</button
                >
              </div>
            {/if}
            <NodeContent {node} {mdId} />
          </main>
        </div>

        <NodeRightPane
          {node}
          {mdId}
          bind:isRightPanelCollapsed
          bind:pane={rightPane}
          on:close={closeRightPane}
        />
      </div>
    {:else}
      <ComingSoonView />
    {/if}
    {#if isShowFloatingBar}
      <div transition:fade={{ duration: 200 }}>
        <BottomFloat>
          <NodeFloatingBar
            {node}
            bind:selectedView
            bind:isWidened
            on:action={(e) => {
              if (
                e.detail === NodeRightPaneType.METADATA ||
                e.detail === NodeRightPaneType.HISTORY
              ) {
                openRightPane(e);
              }
            }}
            on:panel={openRightPane}
            on:none={(e) => {
              if (e.detail === rightPane) {
                closeRightPane();
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
