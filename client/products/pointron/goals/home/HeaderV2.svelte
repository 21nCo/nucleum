<script lang="ts">
  import { currentGoal } from "$lib/client/products/pointron/goals/goal.store";
  import type { IGoal } from "$lib/client/types/pointron/goal.type";
  import Breadcrumb from "$lib/client/elements/breadcrumb/Breadcrumb.svelte";
  import EditToggleButton from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import type { BreadcrumbItem } from "$lib/client/types/breadcrumbItem.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { Item } from "$lib/client/types/item.enum";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  import { determineTruncateLength } from "$lib/shared/utils/text.utils";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  let parentBreadcrumbs: BreadcrumbItem[] = [];
  $: refresh($currentGoal);
  function refresh(goal: IGoal) {
    parentBreadcrumbs = [];
    let parentHierarchy = [];
    parentHierarchy =
      goal.parent?.hierarchy?.map((item, index) => ({
        label: item.label,
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
    <span
      class={cn("text-ccs1", {
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
        <TextWithHoverTooltip
          text={$currentGoal.label}
          truncateLength={determineTruncateLength($view.display, Size.lg)}
        />
      {/if}
    </span>
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
