<script lang="ts">
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import CustomColorPropagator from "@21n/elements/style/CustomColorPropagator.svelte";
  import { resolveResourceIcon } from "@21n/components/flux/resourceStores/resource.utils";
  import { Size } from "@21n/types/size.enum";
  import Icon from "@21n/elements/Icon.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { cn } from "@21n/utils/ui.utils";
  import context from "@21n/stores/context.store";
  import { appStore } from "@21n/stores/app.store";
  import {
    AccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import { createEventDispatcher } from "svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { logger } from "@21n/components/debug/logger.client";
  import { resolveGoalColor } from "@21n/components/goals/goal.utils";
  import { Embed } from "@21n/types/context.type";
  export let goal: IGoalThumb;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  const color = resolveGoalColor(goal);
  const dispatch = createEventDispatcher();

  function onGoalClick(e: MouseEvent) {
    if (
      !($context.isEmbed && $context.embed === Embed.HANDSET) &&
      accessPoint !== ResourceAccessPoint.GOAL
    ) {
      appStore.openResource(goal.id, AccessMode.POP);
      e.stopPropagation();
    }
  }

  function onGoalChange(e: CustomEvent) {
    try {
      const record = e?.detail?.params?.record;
      if (!record) return;
      if ("label" in record && record.label !== goal.label) {
        goal = { ...goal, label: record.label };
      } else if ("color" in record && record.color !== goal.color) {
        goal = { ...goal, color: record.color };
      }
    } catch (error) {
      logger.error({ at: "TaskThumbnailGoalLabel.onGoalChange", error });
    }
  }
</script>

<div class="flex items-center gap-2 w-full">
  <CustomColorPropagator
    {color}
    type={accessPoint !== ResourceAccessPoint.GOAL ? "button" : "div"}
    class={cn("flex items-center gap-1 text-ccs1 flex-grow min-w-0", {
      "text-b4 ": accessPoint !== ResourceAccessPoint.SELF,
      "notouch:hover:underline focus:underline":
        accessPoint !== ResourceAccessPoint.GOAL
    })}
    on:click={onGoalClick}
  >
    {#if accessPoint === ResourceAccessPoint.CAPTURE}
      <Icon
        icon={resolveResourceIcon(Resource.goal)}
        size={Size.sm}
        class="text-ccs1"
      />
    {/if}
    <div class="flex items-center gap-1 text-left truncate flex-grow min-w-0">
      <div class="truncate">
        {goal.label || "Untitled"}
      </div>
    </div>
  </CustomColorPropagator>
  {#if accessPoint === ResourceAccessPoint.SELF || accessPoint === ResourceAccessPoint.CAPTURE}
    <Button
      icon="unlink"
      tooltip="Clear goal"
      size={Size.sm}
      parentBgIndex={2}
      on:click={(e) => {
        e.stopPropagation();
        dispatch("clearGoal");
      }}
    />
  {/if}
</div>

<ComponentBaseLayer subscribeToRecords={[goal.id]} on:change={onGoalChange} />
