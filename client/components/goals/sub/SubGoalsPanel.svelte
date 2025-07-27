<script lang="ts">
  import {
    reorderList,
    type DragDropEvent
  } from "$lib/client/actions/rearrange.action";
  import Button from "$lib/client/elements/button/Button.svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import {
    activeResourceFilterIgnoreParentInactive,
    archivedResourceFilter
  } from "$lib/client/utils/utils";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { ResourceAccessMode } from "../../flux/resourceStores/resource.type";
  import {
    resourceInList,
    shiftResourceInArray
  } from "../../flux/resourceStores/resource.utils";
  import NestedList from "../../nestedList/NestedList.svelte";
  import { NestedListStyle } from "../../nestedList/nestedList.type";
  import { goalStore, type IActiveGoalStore } from "../goal.store";
  import { GoalStatus, SubGoalsLayout, type IGoal } from "../goal.type";
  import { resolveGoalStatusIcon } from "../goal.utils";
  import SubGoalItem from "./SubGoalItem.svelte";
  import SubGoalsLayoutSwitcher from "./SubGoalsLayoutSwitcher.svelte";
  export let goal: IActiveGoalStore;
  export let isActiveResource: boolean = true;
  let isExpandArchiveSubGoals = false;
  let isHideCompleted = $goal.uiState?.isHideCompleted ?? false;
  $: _subGoals = [
    ...($goal.children
      ? $goal.children
          .filter(activeResourceFilterIgnoreParentInactive)
          .filter(
            isHideCompleted
              ? (t) => t.status !== GoalStatus.COMPLETED
              : (t) => t
          )
          .map((t) => ({
            ...t,
            icon: resolveGoalStatusIcon(t.status)
          }))
      : []),
    ...($goal.subGoalsLayout === SubGoalsLayout.STEPS && isActiveResource
      ? [
          {
            label: undefined,
            type: "add"
          }
        ]
      : [])
  ];
  $: archiveSubgoalsCount = $goal.children?.filter(
    archivedResourceFilter
  ).length;

  $: completedSubgoalsCount = $goal.children?.filter(
    (t) => t.status === GoalStatus.COMPLETED
  ).length;

  function onSubGoalClick(id: IRecordId, event?: MouseEvent) {
    appStore.resourceClickHandler(event, id, {
      replaceId: $goal.id
    });
  }

  async function onAddSubGoal(e: any) {
    const result = await goalStore.addSubGoal(
      {
        label: e.detail.label
      },
      $goal.id,
      {
        srcExpanded: $goal
      }
    );
    if (result && Array.isArray(result)) {
      const newGoal = result[0];
      $goal.children = [...($goal.children || []), newGoal];
    }
  }
  async function onAddSubGoalFromNestedList(e: any) {
    await goalStore.addSubGoal(
      {
        label: e.detail.label
      },
      e.detail.id
    );
  }

  async function resolveSubGoals(id: IRecordId) {
    const result = await goalStore.selectMany(
      {
        properties: {
          expand: ["children"]
        },
        filters: {
          id: id.toString()
        }
      },
      {
        isIncludeSubItems: true
      }
    );
    if (!result || !isValidArrayWithData(result)) return [];
    const children = result[0].children;
    if (children)
      return (
        children
          ?.filter(activeResourceFilterIgnoreParentInactive)
          ?.map((t) => t.id) ?? []
      );
    else return [];
  }

  async function resolveContent(id: IRecordId) {
    const item = _subGoals.find(resourceInList(id));
    if (item) return item;
    const result = await goalStore.select(id);
    if (result)
      return {
        ...result,
        icon: resolveGoalStatusIcon(result.status)
      };
    else return "";
  }

  async function onReorderSubGoals(event: DragDropEvent) {
    const { fromId, toId } = event;
    if (!fromId || !toId || fromId === toId || !$goal.children) return;
    $goal.children = shiftResourceInArray($goal.children, fromId, toId);
    _subGoals = shiftResourceInArray(_subGoals, fromId, toId);
    const subGoals = _subGoals.map((t) => t.id).filter((id) => id);
    await goal.modify(
      {
        children: subGoals
      },
      {
        isPreventBackPropagation: true
      }
    );
  }

  function onSubGoalsMethodChange(e: any) {
    goal.modify({
      subGoalsLayout: $goal.subGoalsLayout
    });
  }

  function onHideCompletedChange(e: any) {
    isHideCompleted = !isHideCompleted;
    goal.modify({
      uiState: {
        ...($goal.uiState ?? {}),
        isHideCompleted
      }
    });
  }
</script>

{#if !isActiveResource}
  <div class="flex w-full pt-2 pb-4 justify-center">
    <InlineInfoBanner
      content="You can't add subgoals to this goal when it is archived/deleted/inactive."
      icon="ph:warning-light"
    />
  </div>
{/if}
{#if _subGoals}
  <div class="flex items-center justify-end gap-4 w-full">
    {#if $goal.subGoalsLayout !== SubGoalsLayout.STEPS && completedSubgoalsCount}
      <Button
        icon={isHideCompleted ? "ph:eye-light" : "ph:eye-slash-light"}
        label={`${isHideCompleted ? "Show" : "Hide"} completed (${completedSubgoalsCount})`}
        size={Size.sm}
        style={ButtonStyle.PLAIN}
        on:click={onHideCompletedChange}
      />
    {/if}
    <SubGoalsLayoutSwitcher
      bind:layout={$goal.subGoalsLayout}
      on:select={onSubGoalsMethodChange}
    />
  </div>
  <div
    class={cn("flex flex-col cw:px-2 p-4 userdata", {
      "gap-6": $goal.subGoalsLayout === SubGoalsLayout.STEPS,
      "gap-2": $goal.subGoalsLayout === SubGoalsLayout.DEFAULT
    })}
    use:reorderList={{
      listId: "subGoals",
      draggedOverClass: "!border-ccs1",
      onDrop: onReorderSubGoals,
      dragImage: "dragimage"
    }}
  >
    {#if !$goal.subGoalsLayout || $goal.subGoalsLayout === SubGoalsLayout.DEFAULT}
      <NestedList
        items={_subGoals.map((t) => t.id)}
        contentCallback={resolveContent}
        childrenCallback={resolveSubGoals}
        style={NestedListStyle.OUTLINED}
        isShowAddTextInput={isActiveResource}
        on:click={(e) => {
          if (e.detail) {
            onSubGoalClick(e.detail.id, e.detail.event);
          }
        }}
        on:add={onAddSubGoal}
        on:addSub={onAddSubGoalFromNestedList}
        addPlaceholder="Add new subgoal"
      />
    {:else}
      {#each _subGoals as subGoal, index (subGoal.id || subGoal.type)}
        <SubGoalItem
          {subGoal}
          {index}
          totalLength={_subGoals.length}
          method={$goal.subGoalsLayout}
          on:click={(e) => {
            onSubGoalClick(subGoal.id, e);
          }}
          on:add={onAddSubGoal}
        />
      {/each}
    {/if}
  </div>
{/if}
{#if archiveSubgoalsCount}
  <div class="flex w-full justify-center">
    <button
      class={cn(
        "flex items-center justify-center gap-2 text-b3 text-fgs3 rounded-md p-2",
        {
          "notouch:hover:bg-bgs2 active:bg-bgs2": !isExpandArchiveSubGoals,
          "bg-bgs2": isExpandArchiveSubGoals
        }
      )}
      on:click={() => {
        isExpandArchiveSubGoals = !isExpandArchiveSubGoals;
      }}
    >
      + {archiveSubgoalsCount} archived sub goals
    </button>
  </div>

  {#if isExpandArchiveSubGoals}
    {@const archiveSubGoals = $goal.children?.filter(archivedResourceFilter)}
    {#if archiveSubGoals && isValidArrayWithData(archiveSubGoals)}
      <div class="flex flex-col gap-2 p-4">
        <Text content="Archived sub goals" style={TextStyle.SECTION_HEADING} />
        <div class="flex flex-col userdata">
          {#each archiveSubGoals as child}
            <!-- <SubGoalItem {child} /> -->
            <SubGoalItem
              subGoal={child}
              on:click={(e) => {
                onSubGoalClick(child.id, e);
              }}
            />
          {/each}
        </div>
      </div>
    {/if}
  {/if}
{/if}
