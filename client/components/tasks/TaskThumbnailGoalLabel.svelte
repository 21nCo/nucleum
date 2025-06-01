<script lang="ts">
  import type { IGoal } from "../goals/goal.type";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { resolveResourceIcon } from "../flux/resourceStores/resource.utils";
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import context from "$lib/client/stores/context.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "../flux/resourceStores/resource.type";
  import { createEventDispatcher } from "svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { logger } from "../debug/logger.client";
  export let goal: IGoal;
  export let isCreateContext: boolean = false;
  const dispatch = createEventDispatcher();

  function onGoalClick(e: MouseEvent) {
    if (!$context.isEmbed && !isCreateContext) {
      appStore.openResource(goal.id, ResourceAccessMode.POP);
      e.stopPropagation();
    }
    dispatch("click");
  }

  function onGoalChange(e: CustomEvent) {
    try {
      const record = e?.detail?.params?.record;
      if (!record) return;
      if ("label" in record && record.label !== goal.label) {
        goal.label = record.label;
      } else if ("color" in record && record.color !== goal.color) {
        goal.color = record.color;
      }
    } catch (error) {
      logger.error({ at: "TaskThumbnailGoalLabel.onGoalChange", error });
    }
  }
</script>

<CustomColorPropagator
  color={goal.color}
  class={cn("flex items-center gap-1 text-ccs1 w-full", {
    "text-b3 cursor-default notouch:hover:underline focus:underline":
      !isCreateContext
  })}
  on:click={onGoalClick}
>
  {#if isCreateContext}
    <Icon
      icon={resolveResourceIcon(Resource.goal)}
      size={Size.sm}
      class="text-ccs1"
    />
  {/if}
  <div class="flex items-center gap-1 text-left truncate flex-1 min-w-0">
    <div class="truncate">
      {goal.label}
    </div>
    {#if isCreateContext}
      <Button
        icon="ph:x-light"
        tooltip="Clear goal"
        size={Size.sm}
        parentBgIndex={2}
      />
    {/if}
  </div>
</CustomColorPropagator>
<ComponentBaseLayer subscribeToRecords={[goal.id]} on:change={onGoalChange} />
