<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation, Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import LinkItems from "$lib/client/products/memotron/common/linkbox/LinkItems.svelte";
  import LinkSearch from "$lib/client/products/memotron/common/linkbox/LinkSearch.svelte";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { popover, tooltip } from "$lib/client/actions/popover.action";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { ResourceError } from "$lib/client/components/error/errors";
  import { ResourceErrorCode } from "$lib/client/components/error/error.type";
  import type { IActiveGoalStore } from "./goal.store";
  import { resolveGoalTypeIcon } from "./goal.utils";
  import { enumToString } from "$lib/shared/utils/text.utils";

  export let task: IActiveGoalStore;
  export let isReadOnlyMode: boolean = false;
  let popoverRef: any;

  async function onUnlink(e: CustomEvent) {
    await task.unlinkCollection(e.detail);
  }

  async function onSelect(item: any) {
    try {
      hidePopover();
      const id = item.id;
      if (!id) {
        toasts.error();
        return;
      }
      if ($task.collections?.some(resourceInList(id))) {
        toasts.error("Collection already exists.");
        return;
      }
      const result = await task.linkCollection(id);
      if (!result) {
        toasts.error();
        return;
      }
    } catch (e) {
      logger.error(e);
      if (e instanceof ResourceError) {
        if (e.code === ResourceErrorCode.ALREADY_EXISTS) {
          toasts.error("Collection already exists.");
        } else {
          toasts.error();
        }
      } else {
        toasts.error();
      }
    }
  }

  function onClick(e: CustomEvent) {
    appStore.resourceClickHandler(e.detail.event, e.detail.item);
  }
  function hidePopover() {
    popoverRef?.dispatchEvent(new CustomEvent("hide"));
  }
</script>

<div class="flex gap-2 items-center h-full w-full overflow-x-auto mo:pr-4">
  <button
    class="flex items-center gap-2 h-full border border-bgs4 hover:border-fgs3 rounded-full px-2 py-0.5 text-b2 whitespace-nowrap bg-bgs2 text-fgs1"
    on:click={() => {
      appStore.closeResource();
      appStore.gotoPath("/library", {
        queryParams: {
          resource: Resource.task,
          type: $task.type.toLowerCase()
        }
      });
    }}
    use:tooltip={{
      text: `See all **${enumToString($task.type)}** tasks`,
      direction: Placement.Bottom
    }}
  >
    <Icon
      icon={resolveGoalTypeIcon($task.type)}
      size={Size.sm}
      class="fill-fgs1"
    />
    {enumToString($task.type)}
  </button>
  <span class="h-full flex items-center justify-center">
    <Divider
      orientation={Orientation.Vertical}
      colorStrength={ColorStrength.Strong}
    />
  </span>

  {#if $task.collections && $task.collections.length > 0}
    <span>
      <LinkItems
        links={$task.collections}
        {isReadOnlyMode}
        on:unlink={onUnlink}
        on:click={onClick}
      />
    </span>
  {/if}
  {#if !isReadOnlyMode}
    <div
      bind:this={popoverRef}
      use:popover={{
        content: LinkSearch,
        isRenderAsModalForCW: true,
        cwModalPosition: Placement.Top,
        componentProps: {
          onSelectCallback: onSelect,
          searchQuery: "",
          onHideCallback: () => {
            hidePopover();
          },
          ctx: "nodepageCollectionsLane"
        }
      }}
    >
      <Button icon="plus" size={Size.sm} tooltip="Add to a collection" />
    </div>
  {/if}
</div>
