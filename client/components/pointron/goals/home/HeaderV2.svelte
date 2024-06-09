<script lang="ts">
  import { currentGoal } from "$lib/client/components/pointron/goals/goal.store";
  import type { Goal } from "$lib/client/types/pointron/goal.type";
  import Breadcrumb from "$lib/client/elements/breadcrumb/Breadcrumb.svelte";
  import EditToggleButton from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import type { BreadcrumbItem } from "$lib/client/types/breadcrumbItem.type";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import { Item } from "$lib/client/types/item.enum";
  let parentBreadcrumbs: BreadcrumbItem[] = [];
  $: refresh($currentGoal);
  function refresh(goal: Goal) {
    parentBreadcrumbs = [];
    let parentHierarchy = [];
    parentHierarchy =
      goal.parent?.hierarchy?.map((item, index) => ({
        label:
          item.label && item.label.length > 25
            ? `${item.label.slice(0, 25)}...`
            : item.label,
        path: `/${Item.goal}/${item.id}`
      })) ?? [];

    parentBreadcrumbs = isValidArrayWithData(parentHierarchy)
      ? [
          ...parentHierarchy,
          {
            label: $currentGoal.label,
            path: `/${Item.goal}/${$currentGoal.id}`
          }
        ]
      : [];
  }
</script>

<div class="flex justify-between">
  <div class="flex flex-col gap-1 w-full items-start">
    <Breadcrumb items={parentBreadcrumbs} />
    {#if $isInEditMode}
      <input
        type="text"
        bind:value={$currentGoal.label}
        placeholder="Enter goal name"
        class={`text-aps1 w-full bg-transparent focus:outline-none ${
          $view.isPortrait ? `text-h3` : `text-h2 font-medium`
        }`}
      />
    {:else}
      <span class={$view.isPortrait ? `text-h3` : `text-h2 font-medium`}
        >{$currentGoal.label}</span
      >
    {/if}
  </div>
  <div class="flex items-center gap-8 min-w-fit">
    <!-- <Button
      label="Edit goal"
      icon="pencil-square"
      size={Size.sm}
      on:click={() =>
        runAction(PointronEventEnum.CREATE_EDIT_GOAL, { id: $currentGoal.id })}
    /> -->
    {#if !$currentGoal.isArchived}
      <EditToggleButton />
    {/if}
  </div>
</div>

<style>
  span,
  input {
    color: var(--customcolor);
  }
</style>
