<script lang="ts">
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import {
    ResourceAccessPoint,
    ResourceActionType,
    type IMultiSelectContext
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import { LinkType } from "$lib/client/products/memotron/linking/link.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import appearance from "$lib/client/stores/appearance.store";
  import { Theme } from "$lib/client/types/appearance.type";
  import { resolveResourceActionIcon } from "../flux/resourceStores/resource.utils";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { isSameDay } from "$lib/client/utils/time.utils";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import { tooltip } from "$lib/client/actions/popover.action";

  const dispatch = createEventDispatcher();
  export let context: IMultiSelectContext;
  export let subContext: string = "";
  export let isExpandedMode: boolean = false;
  type Action = {
    action: string;
    label: string;
    icon: string;
  };
  let actions: Action[] = [];
  let rightActions: Action[] = [];

  const isHideStar = [Resource.task, Resource.session].includes(
    context.resource
  );
  const isHideArchive = [Resource.task, Resource.session].includes(
    context.resource
  );
  $: multiSelectStore = resolveMultiSelectStore(context);
  const miniButtonProps: {} = {
    size: Size.md,
    style: ButtonStyle.OUTLINED,
    isPreventMinWidth: true
  };
  const expandedButtonProps: {} = {
    size: Size.sm,
    style: ButtonStyle.OUTLINED,
    isPreventMinWidth: true
  };
  $: buttonProps = isExpandedMode ? expandedButtonProps : miniButtonProps;
  $: selector =
    $appearance?.colorScheme?.tailwindSelector?.replace("light", "dark") ?? "";
  $: parentBgIndex = $appearance.theme === Theme.LIGHT ? 1 : 3;

  const selectAllAction = {
    action: "selectAll",
    label: "Select all",
    icon: "ph:check-circle-light"
  };
  const clearSelectionAction = {
    action: "clearSelection",
    label: "Clear selection",
    icon: "ph:x-circle-light"
  };
  const linkAction = {
    action: ResourceActionType.LINK,
    label: "Link to node",
    get icon() {
      return resolveResourceActionIcon(this.action);
    }
  };
  const linkBoxAction = {
    action: "linkbox",
    label: "Link to node or Add to collection",
    icon: resolveResourceActionIcon(ResourceActionType.LINK)
  };
  const collectAction = {
    action: "collect",
    label: "Add to collection",
    icon: resolveResourceActionIcon(ResourceActionType.ADD_TO)
  };
  const uncollectAction = {
    action: ResourceActionType.UNLINK,
    label: "Remove from collection",
    icon: resolveResourceActionIcon(ResourceActionType.REMOVE_FROM)
  };
  const completeAction = {
    action: "complete",
    label: "Mark as completed",
    icon: "ph:check-square-light"
  };
  const moveToToday = {
    action: "moveToToday",
    label: "Move to today",
    icon: "ph:arrow-bend-up-right-light"
  };
  const setDate = {
    action: "setDate",
    label: "Set date",
    icon: "ph:calendar-blank-light"
  };
  const convertAction = {
    action: ResourceActionType.CONVERT,
    label: "Turn into",
    icon: resolveResourceActionIcon(ResourceActionType.CONVERT)
  };

  function resolveAction(action: ResourceActionType) {
    return {
      action,
      label: enumToString(action),
      icon: resolveResourceActionIcon(action)
    };
  }

  resolveItems();

  function resolveItems() {
    if (
      context.accessPoint === ResourceAccessPoint.NODE_LINKS &&
      subContext === LinkType.DIRECT
    ) {
      actions.push(resolveAction(ResourceActionType.UNLINK));
    } else if (context.accessPoint === ResourceAccessPoint.COLLECTION) {
      actions.push(uncollectAction);
    } else if (
      context.accessPoint === ResourceAccessPoint.BROWSER ||
      context.accessPoint === ResourceAccessPoint.LIBRARY
    ) {
      if (context.resource === Resource.node) {
        if (isExpandedMode) actions.push(linkAction, collectAction);
        else actions.push(linkBoxAction);
      } else if (context.resource === Resource.task) {
        actions.push(completeAction);
      }
      if (subContext.includes("starred")) {
        actions.push(resolveAction(ResourceActionType.UNSTAR));
      } else if (!isHideStar) {
        actions.push(resolveAction(ResourceActionType.STAR));
      }
      if (subContext.includes("archived")) {
        actions.push(resolveAction(ResourceActionType.UNARCHIVE));
      } else if (!isHideArchive) {
        actions.push(resolveAction(ResourceActionType.ARCHIVE));
      }
      actions.push(resolveAction(ResourceActionType.DELETE));
    } else if (context.accessPoint === ResourceAccessPoint.MARKDOWN) {
      actions.push(
        // convertAction,
        resolveAction(ResourceActionType.COPY_CONTENTS),
        resolveAction(ResourceActionType.DUPLICATE),
        resolveAction(ResourceActionType.DELETE)
      );
    } else if (
      context.resource === Resource.task &&
      (context.accessPoint === ResourceAccessPoint.CALENDAR ||
        context.accessPoint === ResourceAccessPoint.GOAL)
    ) {
      actions.push(completeAction);
      actions.push(setDate);
      if (context.accessPoint === ResourceAccessPoint.CALENDAR) {
        const date = new Date(subContext);
        const isToday = isSameDay(date, new Date());
        if (!isToday) actions.push(moveToToday);
      }
      actions.push(resolveAction(ResourceActionType.DELETE));
    }

    rightActions.push(selectAllAction, clearSelectionAction);
  }

  function resolveCountLabel(count: number) {
    if (count === 0) return 0;
    const itemLabel =
      context.resource === Resource.node &&
      context.accessPoint === ResourceAccessPoint.MARKDOWN
        ? "block"
        : context.resource;
    if (count === 1) return `1 ${itemLabel}`;
    return `${count} ${itemLabel}s`;
  }
</script>

<!-- TODO - invert color layer with corresponding opposite light/dark color scheme -->
<div
  class={cn(
    "grid grid-cols-[auto_1fr_auto] gap-3 items-center bg-bgs1 dark:bg-bgs3 text-fgs1 border border-brs3 shadow-md rounded-md overflow-auto",
    {
      [selector]: $appearance.theme === Theme.LIGHT,
      "w-full mx-2 px-4 py-2 text-b2": !isExpandedMode,
      "w-full mx-8 px-6 py-3": isExpandedMode
    }
  )}
>
  <span class="flex whitespace-nowrap">
    Selected: {resolveCountLabel($multiSelectStore.length)}
  </span>
  <span class="flex gap-2 overflow-x-auto">
    {#each actions as action}
      {#if action.action === "setDate"}
        <div
          use:tooltip={{
            text: "Set date"
          }}
        >
          <DatePicker
            variant="icon-only"
            on:change={(e) => {
              dispatch("action", {
                action: action.action,
                data: e.detail
              });
            }}
          />
        </div>
      {:else}
        <Button
          label={isExpandedMode ? action.label : undefined}
          tooltip={isExpandedMode ? undefined : action.label}
          icon={action.icon}
          type={action.label === "Delete"
            ? ButtonVariant.DANGER
            : ButtonVariant.SECONDARY}
          {parentBgIndex}
          {...buttonProps}
          on:click={() => {
            dispatch("action", {
              action: action.action
            });
          }}
        />
      {/if}
    {/each}
  </span>
  <span class="flex gap-2 items-center justify-end">
    {#each rightActions as action}
      <Button
        label={isExpandedMode ? action.label : undefined}
        tooltip={isExpandedMode ? undefined : action.label}
        icon={action.icon}
        {parentBgIndex}
        {...buttonProps}
        on:click={() => {
          if (action.action === "selectAll") {
            dispatch("selectAll");
          } else if (action.action === "clearSelection") {
            $multiSelectStore = [];
          } else {
            dispatch("action", {
              action: action.action
            });
          }
        }}
      />
    {/each}
  </span>
</div>
