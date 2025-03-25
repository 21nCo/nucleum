<script lang="ts">
  import {
    reorderList,
    type DragDropEvent
  } from "$lib/client/actions/rearrange.action";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { InputStyle } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import {
    activeResourceFilter,
    archivedResourceFilter
  } from "$lib/client/utils/utils";
  import { ResourceAccessMode } from "../../flux/resourceStores/resource.type";
  import {
    resourceInList,
    shiftResourceInArray
  } from "../../flux/resourceStores/resource.utils";
  import NestedList from "../../nestedList/NestedList.svelte";
  import { NestedListStyle } from "../../nestedList/nestedList.type";
  import { goalStore, type IActiveGoalStore } from "../goal.store";
  import { SubGoalsLayout, type IGoal } from "../goal.type";
  import { resolveGoalStatusIcon } from "../goal.utils";
  import SubGoalItem from "./SubGoalItem.svelte";
  import SubGoalsLayoutSwitcher from "./SubGoalsLayoutSwitcher.svelte";
  export let goal: IActiveGoalStore;
  $: _subGoals = [
    ...($goal.children
      ? $goal.children.filter(activeResourceFilter).map((t) => ({
          ...t,
          icon: resolveGoalStatusIcon(t.status)
        }))
      : []),
    $goal.subGoalsLayout !== SubGoalsLayout.DEFAULT && {
      label: undefined,
      type: "add"
    }
  ];
  $: archiveSubgoalsCount = $goal.children?.filter(
    archivedResourceFilter
  ).length;

  function onSubGoalClick(id: IRecordId) {
    appStore.openResource(id, ResourceAccessMode.POP, {
      replaceId: $goal.id
    });
  }

  async function onAddSubGoal(e: any) {
    const result = await goalStore.addSubGoalWithContext(
      [...($goal.parent || []).map((p) => p.id), $goal.id],
      {
        label: e.detail.label
      },
      $goal.children?.map((t) => t.id)
    );
    if (result && Array.isArray(result)) {
      const newGoal = result[0];
      $goal.children = [...($goal.children || []), newGoal];
    }
  }
  async function onAddSubGoalFromNestedList(e: any) {
    const result = await goalStore.addSubGoal(e.detail.id, {
      label: e.detail.label
    });
  }

  async function resolveSubGoals(id: IRecordId) {
    const result: IGoal = await goalStore.select(id);
    if (result) return result.children;
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
</script>

{#if $goal.children}
  <div class="flex items-center justify-end gap-2 w-full">
    <SubGoalsLayoutSwitcher
      bind:layout={$goal.subGoalsLayout}
      on:select={onSubGoalsMethodChange}
    />
  </div>
  <div
    class={cn("flex flex-col p-4 userdata", {
      "gap-6": $goal.subGoalsLayout === SubGoalsLayout.STEPS,
      "gap-2": $goal.subGoalsLayout === SubGoalsLayout.DEFAULT
    })}
    use:reorderList={{
      listId: "subGoals",
      draggedOverClass: "!border-aps1",
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
        isShowAddTextInput={true}
        on:click={(e) => {
          if (e.detail) {
            onSubGoalClick(e.detail);
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
          on:click={() => {
            onSubGoalClick(subGoal.id);
          }}
          on:add={onAddSubGoal}
        />
      {/each}
    {/if}
  </div>
{/if}
{#if archiveSubgoalsCount}
  <div class="flex items-center justify-center gap-2 w-full text-b3 text-fgs3">
    + {archiveSubgoalsCount} archived sub goals
  </div>
{/if}
