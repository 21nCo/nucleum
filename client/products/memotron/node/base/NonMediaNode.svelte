<script lang="ts">
  import NodeLoadingPulse from "$lib/client/elements/feedback/animations/NodeLoadingPulse.svelte";
  import { type IActiveNodeStore } from "../node.store";
  import NodeRightPanel from "../rightPanel/NodeRightPanel.svelte";
  import { generateUID } from "$lib/client/utils/utils";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import NodeFloatingBar from "../floatingBar/NodeFloatingBar.svelte";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import NodeTitleBreadcrumbs from "../title/NodeTitleBreadcrumbs.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import NodeContent from "../content/NodeContent.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import NodePropertiesOnMainPanel from "../content/NodePropertiesOnMainPanel.svelte";
  import ResourceStatusBanner from "../../common/ResourceStatusBanner.svelte";
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { formatDate } from "$lib/client/utils/time.utils";
  import NodeAvatar from "../avatar/NodeAvatar.svelte";
  import { fade, slide } from "svelte/transition";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  export let node: IActiveNodeStore;
  export let accessMode: ResourceAccessMode;
  export let selectedView: string = "Content";
  let lastScrollTop = 0;
  let scrollDirection = "none";
  let mdId = generateUID();
  let isStickied = false;
  let isShowFloatingBar = true;
  let isWidened = false;
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
</script>

<div class="relative w-full h-full flex flex-col bg-bgs1">
  {#if $node}
    {#if selectedView === "Content"}
      <div class="w-full h-full flex justify-center gap-4 px-6">
        <div
          class={cn("flex flex-col h-full", {
            "flex-grow": isWidened,
            "w-[50rem] overflow-auto": !isWidened
          })}
        >
          {#if $node.parent && $node.parent.length > 0}
            <header class="flex w-full mx-12 py-4">
              <NodeTitleBreadcrumbs {node} />
            </header>
          {/if}
          <main
            class="relative flex flex-col gap-6 h-full flex-grow"
            on:scroll={onScroll}
          >
            <div class="min-h-20" />
            {#if !$node.focusedBlock}
              {#if $node.avatars}
                <span class="flex mx-12 -mb-8">
                  <NodeAvatar avatars={$node.avatars} size={Size.lg} />
                </span>
              {/if}
              <span
                class={cn(
                  "node-title flex gap-3 font-medium text-start sticky top-0 z-10 mx-12 py-3",
                  {
                    "text-h4 bg-bgs1": isStickied,
                    "text-h2 bg-bgs1": !isStickied
                  }
                )}
              >
                {#if isStickied && $node.avatars}
                  <NodeAvatar avatars={$node.avatars} size={Size.sm} />
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
            <ResourceStatusBanner resource={node} />
            {#if $node.types && $node.types.length > 0 && !$node.focusedBlock}
              <!-- TODO - later - show properties of focused node if the focused blocks is associated with a type collection -->
              <div class="px-2">
                <NodePropertiesOnMainPanel {node} />
              </div>
            {/if}
            {#if !$isInEditMode}
              <div
                class="flex justify-center gap-2 bg-bgs2 border-2 border-dotted border-brs3 rounded-md p-2 text-b2 mx-10"
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
            <div class="flex w-full justify-center items-center mt-20">
              <div class="flex flex-col gap-2 mo:w-9/10 w-80">
                <Divider colorStrength={ColorStrength.Strong} />
                <!-- <div class="text-b3 text-fgs3">End of content.</div> -->
                <div class="text-b3 text-fgs3 min-w-fit whitespace-nowrap">
                  Last modified: {formatDate(new Date($node.modifiedAt))}
                </div>
              </div>
            </div>
            <ScrollViewBottomSpacer />
            <ScrollViewBottomSpacer />
            <ScrollViewBottomSpacer />
          </main>
        </div>
        <NodeRightPanel {node} {mdId} />
      </div>
    {:else}
      <ComingSoonView />
    {/if}
    {#if isShowFloatingBar}
      <div transition:fade={{ duration: 200 }}>
        <BottomFloat>
          <NodeFloatingBar
            {node}
            {accessMode}
            bind:selectedView
            bind:isWidened
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
