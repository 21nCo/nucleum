<script lang="ts">
  import NestedGoalAccordion from "./NestedGoalAccordion.svelte";
  import type { Goal } from "../../types/goal.type";
  import AccordionItem from "$lib/client/elements/AccordionItem.svelte";
  import { AccordionIconRenderType } from "$lib/client/types/accordionIconRenderType.enum";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { afterUpdate, createEventDispatcher } from "svelte";
  import { customColorStyle } from "$lib/client/utils/theme.utils";
  import { ColorType } from "$lib/client/types/appearance.type";
  import { Item } from "$lib/client/types/item.enum";

  // Goal Props
  export let id: string = "";
  export let label: string = "";
  export let isArchived: boolean = false;
  export let subGoalCount: number = 0;
  export let subGoals: Goal[] = [];
  export let color: number | undefined;
  export let parent: Pick<Goal, "id" | "label">[] = [];

  //Other Props
  export let nestingLevel: number = 0;
  const dispatch = createEventDispatcher();

  let hasSubGoals: boolean = false;
  let isActive: boolean = false;

  function handleClick() {
    appStore.gotoResource(Item.goal, id);
  }

  function handleStateChange() {
    dispatch("state-change", {
      id,
      nestingLevel,
      subGoalCount,
      isArchived,
      subGoalsLength: subGoals?.length ?? 0
    });
  }

  function createBreadcrumb() {
    let breadcrumb = ``;
    parent.forEach((goal, index) => {
      breadcrumb += `${goal.label} ${index !== parent.length - 1 ? `・` : ``} `;
    });
    return breadcrumb;
  }

  function getHeaderContent(parent: any) {
    if (parent.length === 0) return ``;
    return `<div class="text-b5 w-full flex items-center flex-wrap">${createBreadcrumb()}</div>`;
  }

  $: {
    hasSubGoals = subGoalCount > 0;
  }

  $: isActive = $appStore.currentPath.includes(id);

  $: headerContent = getHeaderContent(parent);
</script>

<AccordionItem
  on:state-change={handleStateChange}
  on:click={handleClick}
  title={label}
  {isActive}
  {nestingLevel}
  {color}
  {headerContent}
  iconRenderType={hasSubGoals
    ? AccordionIconRenderType.VISIBLE
    : AccordionIconRenderType.HIDDEN}
  endContent={hasSubGoals
    ? `<span class="${
        nestingLevel === 0 ? `text-b4` : `text-b5`
      } ml-auto">${subGoalCount} sub goals</span>`
    : ``}
>
  {#if hasSubGoals && subGoals && subGoals.length > 0}
    {#each subGoals as subGoal}
      <NestedGoalAccordion
        on:state-change={(e) => dispatch("state-change", e.detail)}
        id={subGoal.id}
        label={subGoal.label}
        subGoalCount={subGoal.subGoalCount}
        subGoals={subGoal.subGoals}
        color={subGoal.color ?? color}
        nestingLevel={nestingLevel + 1}
        isArchived={subGoal.isArchived}
      />
    {/each}
  {/if}
</AccordionItem>
