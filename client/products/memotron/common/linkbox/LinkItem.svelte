<script lang="ts">
  import { onMount } from "svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import Tag from "$lib/client/elements/text/Tag.svelte";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { collectionStore } from "$lib/client/components/collection/collection.store";
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
  import { popover } from "$lib/client/actions/popover.action";
  import context from "$lib/client/stores/context.store";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import { createEventDispatcher } from "svelte";
  import ContextMenu from "$lib/client/elements/contextMenu/ContextMenu.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  const dispatch = createEventDispatcher();

  export let id: IRecordId;
  export let parentBgIndex: number = 1;
  export let isActive: boolean = false;
  export let isRemovable: boolean = true;
  export let isAlwaysShowRemove: boolean = false;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.CLIPPER;
  let item: any;

  function resolveItem() {
    const resource = determineResourceType(id);
    if (resource === Resource.collection) {
      return collectionStore.select(
        id,
        isExtensionEnvironment() ? { select: [] } : { expand: ["typeToExtend"] }
      );
    } else {
      return nodeStore.select(id);
    }
  }
  onMount(async () => {
    item = await resolveItem();
  });

  function resovleIcon() {
    if (item.avatar) {
      return item.avatar;
    } else if (item.typeToExtend?.avatar) {
      return item.typeToExtend.avatar;
    }
    return undefined;
  }

  function resolveContextMenu() {
    const removeItem = {
      label: "Remove",
      value: "delete",
      icon: "trash",
      callback: async () => {
        dispatch("remove", id);
      }
    };
    if (
      accessPoint === ResourceAccessPoint.CAPTURE ||
      accessPoint === ResourceAccessPoint.CLIPPER
    ) {
      return [
        {
          group: "all",
          items: [removeItem]
        }
      ];
    }
    return [
      {
        group: "all",
        items: [
          {
            label: `Go to ${item?.label}`,
            value: "goToResource",
            icon: "arrow-right",
            callback: async () => {
              dispatch("goToResource", id);
            }
          },
          removeItem
        ]
      }
    ];
  }
</script>

{#if item?.label || item?.text}
  <div
    use:popover={{
      content: ContextMenu,
      triggerMethod:
        $context.isTouchDevice && accessPoint === ResourceAccessPoint.SELF
          ? [PopoverTriggerMethod.CLICK]
          : [PopoverTriggerMethod.RIGHT_CLICK],
      // componentProps: {
      //   label: item?.label,
      //   onGoToResource: () => {
      //     dispatch("goToResource", id);
      //   },
      //   onRemove: () => {
      //     dispatch("remove", id);
      //   }
      // },
      componentProps: { menuResolver: resolveContextMenu },
      id: "linkItemContextMenu",
      groupId: "linkItemContextMenuGroup"
    }}
  >
    <Tag
      {id}
      label={item?.label || item?.text}
      {parentBgIndex}
      {isActive}
      isShowExpandFeedbackOnActive={true}
      icon={resovleIcon()}
      {isRemovable}
      removeStyle={isAlwaysShowRemove ? "always-show" : "inline"}
      on:click
      on:remove
    />
  </div>
{/if}
