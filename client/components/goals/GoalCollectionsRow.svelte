<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import Button from "@21n/elements/button/Button.svelte";
  import Divider from "@21n/elements/Divider.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { toasts } from "@21n/stores/notification.store";
  import { ColorStrength } from "@21n/types/appearance.type";
  import { Orientation, Placement } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import LinkItems from "@21n/products/memotron/common/linkbox/LinkItems.svelte";
  import LinkSearch from "@21n/products/memotron/common/linkbox/LinkSearch.svelte";
  import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";
  import { popover, tooltip } from "@21n/actions/popover.action";
  import { logger } from "@21n/components/debug/logger.client";
  import { ResourceError } from "@21n/components/error/errors";
  import { ResourceErrorCode } from "@21n/components/error/error.type";
  import type { IActiveGoalStore } from "@21n/components/goals/goal.store";
  import { resolveGoalTypeIcon } from "@21n/components/goals/goal.utils";
  import { enumToString } from "@21n/shared-utils/text.utils";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";

  let {
    goal,
    isReadOnlyMode = false
  }: {
    goal: IActiveGoalStore;
    isReadOnlyMode?: boolean;
  } = $props();

  let popoverRef = $state<any>(undefined);

  async function onUnlink(e: CustomEvent) {
    await goal.unlinkCollection(e.detail);
  }

  async function onSelect(item: any) {
    try {
      hidePopover();
      const id = item.id;
      if (!id) {
        toasts.error();
        return;
      }
      if ($goal.collections?.some(resourceInList(id))) {
        toasts.error("Collection already exists.");
        return;
      }
      const result = await goal.linkCollection(id);
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
    onclick={() => {
      appStore.closeResource();
      appStore.gotoPath("/library", {
        queryParams: {
          resource: Resource.goal,
          type: $goal.type?.toLowerCase()
        }
      });
    }}
    use:tooltip={{
      text: `See all **${enumToString($goal.type)}** goals`,
      direction: Placement.Bottom
    }}
  >
    <Icon
      icon={resolveGoalTypeIcon($goal.type)}
      size={Size.sm}
      class="fill-fgs1"
    />
    {enumToString($goal.type)}
  </button>
  <span class="h-full flex items-center justify-center">
    <Divider
      orientation={Orientation.Vertical}
      colorStrength={ColorStrength.Strong}
    />
  </span>

  {#if $goal.collections && $goal.collections.length > 0}
    <span>
      <LinkItems
        links={$goal.collections}
        {isReadOnlyMode}
        onUnlink={onUnlink}
        onClick={onClick}
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
        id: "goal-collections-row-popover",
        componentProps: {
          onSelectCallback: onSelect,
          searchQuery: "",
          onHideCallback: () => {
            hidePopover();
          },
          accessPoint: ResourceAccessPoint.GOAL,
          isCollectionsLane: true
        }
      }}
    >
      <Button icon="plus" size={Size.sm} tooltip="Add to a collection" />
    </div>
  {/if}
</div>
