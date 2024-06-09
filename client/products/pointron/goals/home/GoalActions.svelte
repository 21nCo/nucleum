<script lang="ts">
  import { currentGoal } from "$lib/client/products/pointron/goals/goal.store";
  import { pointronEvents } from "$lib/client/products/pointron/pointron.store";
  import { GoalContextMenuAction } from "$lib/client/types/pointron/goalContextMenuAction.enum";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import view from "$lib/client/stores/view.store";
  import { Persistence } from "$lib/client/persistence/persistence";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Item } from "$lib/client/types/item.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  import { appStore } from "$lib/client/stores/app.store";
  let goalActions: any[] = [];
  refrechGoalActions();
  onMount(() => {
    const sub = currentGoal.subscribe(() => {
      refrechGoalActions();
    });
    return () => {
      sub();
    };
  });
  function refrechGoalActions() {
    goalActions = [];
    if (!$currentGoal.isArchived) {
      goalActions = [
        // {
        //   label: "Focus now",
        //   action: GoalContextMenuAction.FOCUS_NOW,
        //   icon: "play"
        // },
        {
          label: $currentGoal.isFavorite
            ? "Remove from favorites"
            : "Add to favorites",
          action: GoalContextMenuAction.TOGGLE_FAVORITE,
          icon: "heart"
        },
        {
          label: $currentGoal.isPinnedForQuickStart
            ? "Unpin from Quick Focus"
            : "Pin to Quick Focus",
          action: GoalContextMenuAction.TOGGLE_PIN_TO_QUICK_START,
          icon: "rocket"
        }
      ];
    }
    goalActions = [
      ...goalActions,
      {
        label: $currentGoal.isArchived ? "Unarchive" : "Archive",
        action: GoalContextMenuAction.ARCHIVE,
        icon: "archive"
      },
      {
        label: "Delete",
        action: GoalContextMenuAction.DELETE,
        icon: "trash"
      }
    ];
  }

  async function handleDeleteGoal() {
    await new Persistence().delete($currentGoal.id, Item.PointGoal);
    // check if success then redirect to the parent goal or /goals(if the parent does not exists)
    if (!parent || parent.length === 0) appStore.gotoPath(Item.goal);
    else appStore.gotoPath(`/goals`);
    currentGoal.propagateChangesTemp();
  }

  async function runGoalAction(action: GoalContextMenuAction) {
    switch (action) {
      case GoalContextMenuAction.FOCUS_NOW: {
        // handleFocusNow();
        break;
      }
      case GoalContextMenuAction.TOGGLE_FAVORITE: {
        $currentGoal.isFavorite = !$currentGoal.isFavorite;
        break;
      }
      case GoalContextMenuAction.TOGGLE_PIN_TO_QUICK_START: {
        $currentGoal.isPinnedForQuickStart =
          !$currentGoal.isPinnedForQuickStart;
        break;
      }
      case GoalContextMenuAction.ARCHIVE: {
        $currentGoal.isArchived = !$currentGoal.isArchived;
        break;
      }
      case GoalContextMenuAction.DELETE: {
        confirmationNotification.notify({
          title: "Delete goal",
          message: "Are you sure you want to delete this goal?",
          confirmAction: {
            label: "Delete",
            variant: ButtonVariant.DANGER,
            callback: handleDeleteGoal
          }
        });
        break;
      }
      case GoalContextMenuAction.TOGGLE_BETWEEN_GOAL_AND_SUBGOAL: {
        // if (parentHierarchy && parentHierarchy.length > 0) {
        //   await new GoalPersistance().convertToGoal($currentGoal.id);
        //   parentHierarchy = [];
        // } else {
        //   appStore.runAction(PointronEventEnum.CONVERT_TO_SUBGOAL, {
        //     id: $currentGoal.id
        //   });
        // }
        // currentGoal.propagateChangesTemp()
        break;
      }
    }
  }
</script>

<div class="flex flex-wrap gap-3">
  {#each goalActions as action}
    <Button
      size={$view.isPortrait ? Size.sm : Size.xs}
      label={!$view.isPortrait ? action.label : action.label}
      icon={action.icon}
      type={action.label == "Delete"
        ? ButtonVariant.DANGER
        : ButtonVariant.SECONDARY}
      on:click={() => runGoalAction(action.action)}
    />
  {/each}
</div>
