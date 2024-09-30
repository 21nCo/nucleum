<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import LinkItems from "../../common/linkbox/LinkItems.svelte";
  import LinkSearch from "../../common/linkbox/LinkSearch.svelte";
  import type { IActiveNodeStore } from "../node.store";
  import { resolveNodeIcon } from "../node.utils";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";

  export let node: IActiveNodeStore;
  let searchQuery = "";
  let popoverRef: any;
  let searchInputRef: any;
  async function onUnlink(e: CustomEvent) {
    await node.unlinkCollection(e.detail);
  }
  async function onSelect(e: CustomEvent) {
    popoverRef.hide();
    searchQuery = "";
    const id = e.detail.item.id;
    if (!id) {
      toasts.error("Something went wrong. Please try again later.");
      return;
    }
    if ($node.collections?.some(resourceInList(id))) {
      toasts.error("Collection already exists.");
      return;
    }
    const result = await node.linkCollection(id);
    if (!result) {
      toasts.error("Something went wrong. Please try again later.");
      return;
    }
  }

  function onClick(e: CustomEvent) {
    appStore.resourceClickHandler(
      e.detail.event,
      e.detail.item,
      ResourceAccessMode.POP
    );
  }
</script>

<div class="flex gap-2 items-center justify-center h-full">
  <button
    class="flex items-center gap-2 h-full border border-bgs4 hover:border-fgs3 rounded-full px-2 py-0.5 text-b2 whitespace-nowrap bg-bgs2 text-fgs1"
    on:click={() => {
      appStore.closeResource();
      appStore.gotoPath("library", {
        queryParams: {
          resource: Resource.node,
          type: $node.contentType.toLowerCase()
        }
      });
    }}
  >
    <Icon
      icon={resolveNodeIcon($node.contentType)}
      size={Size.sm}
      class="fill-fgs1"
    />
    <!-- {resolveNodeContentLabel($node.contentType)} -->
  </button>
  <span class="h-full flex items-center justify-center">
    <Divider
      orientation={Orientation.Vertical}
      colorStrength={ColorStrength.Strong}
    />
  </span>
  {#if $node.collections && $node.collections.length > 0}
    <span>
      <LinkItems
        links={$node.collections}
        on:unlink={onUnlink}
        on:click={onClick}
      />
    </span>
  {/if}
  <Popover
    bind:this={popoverRef}
    on:show={() => {
      searchInputRef?.focus();
    }}
  >
    <Button icon="plus" size={Size.sm} tooltip="Add to a collection" />
    <slot name="popover" slot="popover">
      <div class="w-96 p-4">
        <LinkSearch
          bind:this={searchInputRef}
          context="nodepageCollectionsLane"
          bind:searchQuery
          on:select={onSelect}
        />
      </div>
    </slot>
  </Popover>
</div>
