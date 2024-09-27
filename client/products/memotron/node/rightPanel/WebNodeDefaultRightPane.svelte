<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import Resources from "../../common/Resources.svelte";
  import LinkThumbnailItems from "../links/LinkThumbnailItems.svelte";
  import { nodeStore, type IActiveNodeStore } from "../node.store";
  import {
    NodeRightPaneType,
    type INode,
    type INodeLinkThumb
  } from "../node.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  export let node: IActiveNodeStore;
  export let pane: NodeRightPaneType | undefined = undefined;
  let links: { link: INodeLinkThumb; node: INode }[] = [];
  function onChange(e: any) {
    if ($node.notes) node.debouncedModify({ notes: $node.notes });
  }

  onMount(async () => {
    await refreshLinks();
  });

  async function refreshLinks() {
    if (!$node.links) return;
    const result = await nodeStore.selectMany({
      filters: {
        id: $node.links.map((x) => x.linkedTo.toString())
      }
    });
    if (!result || result.length == 0) {
      links = [];
      return;
    }
    links = result.slice(0, 2).map((x: INode) => ({
      link: $node.links?.find((y) => isSameResource(y.linkedTo, x.id)),
      node: x
    }));
  }

  function onLinkClick(e: CustomEvent) {
    appStore.resourceClickHandler(
      e.detail.event,
      e.detail.id,
      ResourceAccessMode.POP
    );
  }
</script>

<div
  class="flex flex-col gap-4 justify-center items-start w-full h-full p-2 dp:p-3"
>
  <Text content="Overview" style={TextStyle.PANEL_HEADING_SMALL} />
  {#if $node.clips?.length > 0}
    <div class="flex flex-col gap-4 items-start w-full h-1/3 min-h-0">
      <span class="flex flex-row justify-between items-center w-full">
        <span class="flex flex-row gap-1 items-center">
          <Text content="Clips" style={TextStyle.SECTION_HEADING} />
          <Badge text={$node.clips?.length || 0} />
        </span>
      </span>
      <div class="flex flex-col gap-4 overflow-auto">
        <Resources
          data={$node.clips.slice(0, 3)}
          accessPoint={ResourceAccessPoint.OTHER}
          resource={Resource.node}
          size={Size.sm}
        />
        {#if $node.clips?.length > 3}
          <span class="w-full flex justify-center">
            <Button
              size={Size.sm}
              label={`View all (${$node.clips?.length})`}
              isUnderlined={true}
              style={ButtonStyle.PLAIN}
              on:click={() => (pane = NodeRightPaneType.TRACES)}
            />
          </span>
        {/if}
      </div>
    </div>
  {/if}
  <div
    class={cn("flex flex-col gap-2 items-start w-full min-h-0", {
      "h-1/3": links.length > 0
    })}
  >
    <span class="flex flex-row justify-between items-center w-full">
      <span class="flex flex-row gap-1 items-center">
        <Text content="Links" style={TextStyle.SECTION_HEADING} />
        <Badge text={$node.links?.length || 0} />
      </span>
    </span>
    <div class="w-full min-h-32 flex flex-col gap-3 overflow-auto">
      {#if $node.links && $node.links.length > 0}
        <LinkThumbnailItems
          {links}
          accessPointId={node.id}
          on:click={onLinkClick}
          accessPoint={ResourceAccessPoint.NODE_DEFAULT_RIGHT_PANE}
        />
      {:else}
        <span
          class="flex w-full justify-center items-center text-fgs3 text-b3 h-1/2"
        >
          No links found
        </span>
      {/if}
      <span class="w-full flex justify-center">
        <Button
          size={Size.sm}
          label="Go to links"
          isUnderlined={true}
          style={ButtonStyle.PLAIN}
          on:click={() => (pane = NodeRightPaneType.LINKS)}
        />
      </span>
    </div>
  </div>
  <div class="flex flex-col gap-2 items-start w-full flex-1">
    <span class="flex flex-row justify-between items-center w-full">
      <span class="flex flex-row gap-1 items-center">
        <Text content="Side notes" style={TextStyle.SECTION_HEADING} />
      </span>
      <span>
        <Button
          icon="ph:arrows-out-simple-thin"
          size={Size.sm}
          on:click={() => (pane = NodeRightPaneType.SIDENOTES)}
        />
      </span>
    </span>
    <div class="w-full flex-1 bg-bgs2 rounded-md p-4">
      <InlineMarkdownTextInput
        placeholder="Add notes"
        bind:content={$node.notes}
        on:change={onChange}
      />
    </div>
  </div>
</div>
