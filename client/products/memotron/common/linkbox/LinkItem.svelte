<script lang="ts">
  import type { IRecordId } from "@21n/types/data.type";
  import Tag from "@21n/elements/text/Tag.svelte";
  import { determineResourceType } from "@21n/components/flux/resourceStores/resource.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { collectionStore } from "@21n/components/collection/collection.store";
  import { nodeStore } from "@21n/products/memotron/node/node.store";
  import { popover } from "@21n/actions/popover.action";
  import context from "@21n/stores/context.store";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import ContextMenu from "@21n/elements/contextMenu/ContextMenu.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";

  let {
    id,
    parentBgIndex = 1,
    isActive = false,
    isRemovable = true,
    isAlwaysShowRemove = false,
    accessPoint = ResourceAccessPoint.CLIPPER,
    onclick = undefined,
    onGoToResource = undefined,
    onRemove = undefined
  }: {
    id: IRecordId;
    parentBgIndex?: number;
    isActive?: boolean;
    isRemovable?: boolean;
    isAlwaysShowRemove?: boolean;
    accessPoint?: ResourceAccessPoint;
    onclick?: ((event: MouseEvent) => void) | undefined;
    onGoToResource?: ((event: CustomEvent<IRecordId>) => void) | undefined;
    onRemove?: ((event: CustomEvent<IRecordId>) => void) | undefined;
  } = $props();
  let item = $state<any>(undefined);

  async function resolveItem() {
    const resource = determineResourceType(id);
    if (resource === Resource.collection) {
      item = await collectionStore.select(id, { expand: ["typeToExtend"] });
    } else {
      item = await nodeStore.select(id);
    }
    if (!item) throw new Error("Item not found");
  }

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
        const removeEvent = new CustomEvent<IRecordId>("remove", {
          detail: id
        });
        onRemove?.(removeEvent);
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
            icon: "proceed",
            callback: async () => {
              const goToResourceEvent = new CustomEvent<IRecordId>(
                "goToResource",
                {
                  detail: id
                }
              );
              onGoToResource?.(goToResourceEvent);
            }
          },
          removeItem
        ]
      }
    ];
  }
</script>

{#await resolveItem()}
  <span />
{:then}
  <div
    use:popover={{
      content: ContextMenu,
      triggerMethod:
        $context.isTouchDevice && accessPoint === ResourceAccessPoint.SELF
          ? [PopoverTriggerMethod.CLICK]
          : [PopoverTriggerMethod.RIGHT_CLICK],
      componentProps: { menuResolver: resolveContextMenu },
      id: "linkItemContextMenu",
      groupId: "linkItemContextMenuGroup"
    }}
  >
    <Tag
      {id}
      label={item?.label || item?.text || "Untitled"}
      {parentBgIndex}
      {isActive}
      isShowExpandFeedbackOnActive={true}
      icon={resovleIcon()}
      {isRemovable}
      removeStyle={isAlwaysShowRemove ? "always-show" : "inline"}
      onclick={(event) => {
        onclick?.(event);
      }}
      onRemove={() => {
        const removeEvent = new CustomEvent<IRecordId>("remove", {
          detail: id
        });
        onRemove?.(removeEvent);
      }}
    />
  </div>
{/await}
