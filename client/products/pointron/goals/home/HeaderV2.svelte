<script lang="ts">
  import {
    currentGoal,
    goalStore
  } from "$lib/client/products/pointron/goals/goal.store";
  import type { IGoal } from "$lib/client/types/pointron/goal.type";
  import Breadcrumb from "$lib/client/elements/breadcrumb/Breadcrumb.svelte";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import type { BreadcrumbItem } from "$lib/client/types/breadcrumbItem.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { sessionStore } from "../../focus/session.store";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  let parentBreadcrumbs: BreadcrumbItem[] = [];
  $: refresh($currentGoal);
  function refresh(goal: IGoal) {
    parentBreadcrumbs = [];
    let parentHierarchy = [];
    parentHierarchy =
      goal.parent?.hierarchy?.map((item, index) => ({
        label: item.label,
        path: `/${Resource.goal}/${item.id}`
      })) ?? [];

    parentBreadcrumbs = isValidArrayWithData(parentHierarchy)
      ? [
          ...parentHierarchy,
          {
            label: $currentGoal.label,
            path: `/${Resource.goal}/${$currentGoal.id}`
          }
        ]
      : [];
  }
  async function handleDeleteGoal() {
    //TODO - delete goal - using resource store.
    await goalStore.delete($currentGoal.id);
    // await new Persistence().delete($currentGoal.id, Resource.PointGoal);
    // check if success then redirect to the parent goal or /goals(if the parent does not exists)
    if (!parent || parent.length === 0) appStore.gotoPath(Resource.goal);
    else appStore.gotoPath(`/goal`);
  }

  let contextMenu = [
    {
      group: "all",
      items: [
        {
          value: "edit",
          label: $isInEditMode ? "Close edit mode" : "Edit",
          icon: "pencil-square",
          callback: () => isInEditMode.toggle()
        },
        {
          value: "focus",
          icon: "arrow-right-circled",
          callback: () => {
            sessionStore.quickStart($currentGoal.id);
          }
        },
        {
          value: "star",
          label: $currentGoal.isStarred ? "Unstar" : "Star",
          icon: "star",
          callback: () => {
            $currentGoal.isStarred = !$currentGoal.isStarred;
          }
        }
      ]
    },
    {
      group: "more",
      items: [
        {
          value: "archive",
          label: $currentGoal.isArchived ? "Unarchive" : "Archive",
          icon: "archive",
          callback: () => {
            $currentGoal.isArchived = !$currentGoal.isArchived;
          }
        },
        {
          value: "delete",
          icon: "trash",
          callback: () =>
            confirmationNotification.notify({
              title: "Delete goal",
              message: "Are you sure you want to delete this goal?",
              confirmAction: {
                label: "Delete",
                variant: ButtonVariant.DANGER,
                callback: handleDeleteGoal
              }
            })
        }
      ]
    }
  ];
</script>

<div class="flex w-full gap-2">
  <div class="flex flex-col gap-1 items-start min-w-0 flex-1">
    <Breadcrumb items={parentBreadcrumbs} />
    <span
      class={cn("text-ccs1 w-full", {
        "text-h3": $view.isPortrait,
        "text-h2 font-medium": !$view.isPortrait
      })}
    >
      {#if $isInEditMode}
        <input
          type="text"
          bind:value={$currentGoal.label}
          placeholder="Enter goal name"
          class={cn("w-full bg-transparent focus:outline-none")}
        />
      {:else}
        <TextWithHoverTooltip text={$currentGoal.label} class="truncate" />
      {/if}
    </span>
  </div>
  <div class="flex items-center gap-8 min-w-fit shrink-0">
    <ContextMenuAction {contextMenu} />
  </div>
</div>
